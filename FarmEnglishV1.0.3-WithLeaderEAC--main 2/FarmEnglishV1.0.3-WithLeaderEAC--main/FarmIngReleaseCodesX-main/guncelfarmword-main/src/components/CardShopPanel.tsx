import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFarmStore } from '../store/farmStore';
import * as Haptics from 'expo-haptics';
import {
  CARD_THEME_OVERLAYS,
  COLLECTIBLE_CARDS,
  RARITY_COLORS,
  FONT_STYLES,
  BORDER_STYLES,
  getThemeOverlay,
  checkThemeUnlock,
  type CardThemeOverlay,
  type CollectibleCard,
  type CardRarity,
  type CardFontStyle,
  type CardBorderStyle,
} from '../data/cardThemes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ShopTab = 'themes' | 'collection' | 'customize';

interface CardShopPanelProps {
  onClose?: () => void;
}

// ═══════════════════════════════════════════════════════════════
// 🎨 Kart Önizleme Bileşeni
// ═══════════════════════════════════════════════════════════════
const ThemePreviewCard: React.FC<{
  theme: CardThemeOverlay;
  isOwned: boolean;
  isActive: boolean;
  coins: number;
  onBuy: () => void;
  onEquip: () => void;
}> = ({ theme, isOwned, isActive, coins, onBuy, onEquip }) => {
  const rarity = RARITY_COLORS[theme.rarity];
  const canAfford = theme.price === 0 || coins >= theme.price;

  return (
    <View style={[styles.themeCard, { borderColor: rarity.border }]}>
      <LinearGradient
        colors={[...theme.previewGradient] as [string, string, string]}
        style={styles.themePreview}
      >
        {/* Tint overlay */}
        <LinearGradient
          colors={[...theme.gradientTint] as [string, string]}
          style={StyleSheet.absoluteFill}
        />
        {/* Card content preview */}
        <Text style={styles.themeEmoji}>{theme.emoji}</Text>
        <Text style={[styles.themePreviewWord, { color: theme.borderGlow }]}>
          Example
        </Text>
        <Text style={[styles.themePreviewMeaning, { color: theme.borderColor }]}>
          Örnek
        </Text>
        {/* Border glow effect */}
        <View style={[styles.themeBorderGlow, {
          borderColor: theme.borderColor,
          shadowColor: theme.borderGlow,
        }]} />
      </LinearGradient>

      {/* Info section */}
      <View style={styles.themeInfo}>
        <View style={styles.themeNameRow}>
          <Text style={styles.themeName}>{theme.name}</Text>
          <View style={[styles.rarityBadge, { backgroundColor: rarity.bg }]}>
            <Text style={[styles.rarityText, { color: rarity.text }]}>
              {rarity.label}
            </Text>
          </View>
        </View>
        <Text style={styles.themeDesc}>{theme.description}</Text>

        {/* Action button */}
        {isActive ? (
          <View style={[styles.themeBtn, styles.themeBtnActive]}>
            <Text style={styles.themeBtnActiveText}>✓ Aktif</Text>
          </View>
        ) : isOwned ? (
          <TouchableOpacity
            style={[styles.themeBtn, styles.themeBtnEquip]}
            onPress={onEquip}
          >
            <Text style={styles.themeBtnEquipText}>Kullan</Text>
          </TouchableOpacity>
        ) : theme.price === 0 ? (
          <View style={[styles.themeBtn, styles.themeBtnLocked]}>
            <Text style={styles.themeBtnLockedText}>
              🔒 {theme.unlockDescription || 'Başarı ile aç'}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.themeBtn,
              canAfford ? styles.themeBtnBuy : styles.themeBtnCantAfford,
            ]}
            onPress={onBuy}
            disabled={!canAfford}
          >
            <Text style={canAfford ? styles.themeBtnBuyText : styles.themeBtnCantAffordText}>
              💰 {theme.price.toLocaleString()}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════
// 🏆 Koleksiyon Kartı Bileşeni
// ═══════════════════════════════════════════════════════════════
const CollectibleCardItem: React.FC<{
  card: CollectibleCard;
  isUnlocked: boolean;
  progress: number;
}> = ({ card, isUnlocked, progress }) => {
  const rarity = RARITY_COLORS[card.rarity];
  const progressPct = Math.min(progress / card.unlockTarget, 1);

  return (
    <View style={[styles.collectibleCard, {
      borderColor: isUnlocked ? rarity.border : 'rgba(100,100,100,0.3)',
      opacity: isUnlocked ? 1 : 0.7,
    }]}>
      <View style={styles.collectibleTop}>
        <Text style={styles.collectibleEmoji}>
          {isUnlocked ? card.emoji : '🔒'}
        </Text>
        <View style={[styles.rarityBadge, { backgroundColor: rarity.bg }]}>
          <Text style={[styles.rarityText, { color: rarity.text }]}>
            {rarity.label}
          </Text>
        </View>
      </View>
      <Text style={[styles.collectibleName, !isUnlocked && styles.collectibleNameLocked]}>
        {isUnlocked ? card.name : '???'}
      </Text>
      <Text style={styles.collectibleDesc}>
        {isUnlocked ? card.description : card.unlockCondition}
      </Text>
      {/* Progress bar */}
      {!isUnlocked && (
        <View style={styles.collectibleProgressBg}>
          <View style={[styles.collectibleProgressFill, {
            width: `${progressPct * 100}%`,
            backgroundColor: rarity.border,
          }]} />
          <Text style={styles.collectibleProgressText}>
            {progress}/{card.unlockTarget}
          </Text>
        </View>
      )}
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════
// 🎛️ ANA BİLEŞEN
// ═══════════════════════════════════════════════════════════════
export const CardShopPanel: React.FC<CardShopPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<ShopTab>('themes');
  const [filterRarity, setFilterRarity] = useState<CardRarity | 'all'>('all');

  // Store data selectors
  const coins = useFarmStore(s => s.coins);
  const ownedThemes = useFarmStore(s => s.ownedCardThemes);
  const activeTheme = useFarmStore(s => s.activeCardTheme);
  const collectedCards = useFarmStore(s => s.collectedCards);
  const cardCustomization = useFarmStore(s => s.cardCustomization);

  // Stats for unlock checks — individual primitives avoid new-object-per-render
  const lifetimeHarvests = useFarmStore(s => s.lifetimeHarvests || 0);
  const lifetimeQuizAnswered = useFarmStore(s => s.lifetimeQuizAnswered || 0);
  const bestStreak = useFarmStore(s => s.bestStreak || 0);
  const lifetimeBattlesWon = useFarmStore(s => s.lifetimeBattlesWon || 0);
  const totalQuizzes = useFarmStore(s => s.totalQuizzes || 0);
  const battleWins = useFarmStore(s => s.battleWins || 0);
  const dailyStreak = useFarmStore(s => s.dailyStreak || 0);
  const lifetimeCoins = useFarmStore(s => s.lifetimeCoins || 0);
  const lifetimePlantedWords = useFarmStore(s => s.lifetimePlantedWords || 0);

  const stats = useMemo(() => ({
    lifetimeHarvests,
    lifetimeQuizAnswered,
    bestStreak,
    lifetimeBattlesWon,
    totalQuizzes,
    battleWins,
    dailyStreak,
    lifetimeCoins,
    lifetimePlantedWords,
  }), [lifetimeHarvests, lifetimeQuizAnswered, bestStreak, lifetimeBattlesWon, totalQuizzes, battleWins, dailyStreak, lifetimeCoins, lifetimePlantedWords]);

  // Filtered themes
  const filteredThemes = useMemo(() => {
    if (filterRarity === 'all') return CARD_THEME_OVERLAYS;
    return CARD_THEME_OVERLAYS.filter(t => t.rarity === filterRarity);
  }, [filterRarity]);

  // Collectible progress
  const collectibleProgress = useMemo(() => {
    const map: Record<string, number> = {};
    for (const card of COLLECTIBLE_CARDS) {
      map[card.id] = stats[card.unlockKey as keyof typeof stats] || 0;
    }
    return map;
  }, [stats]);

  const handleBuyTheme = useCallback((theme: CardThemeOverlay) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Achievement-locked tema
    if (theme.price === 0 && theme.unlockRequirement) {
      const unlocked = checkThemeUnlock(theme.id, stats);
      if (!unlocked) {
        Alert.alert('🔒 Kilitli', theme.unlockDescription || 'Bu temayı açmak için başarıyı tamamla');
        return;
      }
      // Free unlock
      const success = useFarmStore.getState().purchaseCardTheme(theme.id);
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      return;
    }

    // Coin ile satın al
    Alert.alert(
      `${theme.emoji} ${theme.name}`,
      `Bu temayı ${theme.price.toLocaleString()} coin'e satın almak istiyor musun?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: `💰 ${theme.price.toLocaleString()} Satın Al`,
          onPress: () => {
            const success = useFarmStore.getState().purchaseCardTheme(theme.id);
            if (success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Yetersiz Coin', 'Bu temayı almak için yeterli coinin yok');
            }
          },
        },
      ]
    );
  }, [stats]);

  const handleEquipTheme = useCallback((themeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    useFarmStore.getState().setActiveCardTheme(themeId);
  }, []);

  const handleCustomizationChange = useCallback((key: string, value: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    useFarmStore.getState().updateCardCustomization({ [key]: value });
  }, []);

  const tabs = useMemo(() => [
    { id: 'themes' as ShopTab, label: 'Temalar', icon: '🎨', count: CARD_THEME_OVERLAYS.length },
    { id: 'collection' as ShopTab, label: 'Koleksiyon', icon: '🏆', count: `${collectedCards.length}/${COLLECTIBLE_CARDS.length}` },
    { id: 'customize' as ShopTab, label: 'Kişiselleştir', icon: '⚙️', count: null },
  ], [collectedCards.length]);

  const rarityFilters: { id: CardRarity | 'all'; label: string; color: string }[] = [
    { id: 'all', label: 'Hepsi', color: '#fff' },
    { id: 'common', label: 'Sıradan', color: RARITY_COLORS.common.text },
    { id: 'rare', label: 'Nadir', color: RARITY_COLORS.rare.text },
    { id: 'epic', label: 'Epik', color: RARITY_COLORS.epic.text },
    { id: 'legendary', label: 'Efsanevi', color: RARITY_COLORS.legendary.text },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#6366f1', '#8b5cf6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>🎨 Kart Mağazası</Text>
        <View style={styles.coinContainer}>
          <Text style={styles.coinIcon}>💰</Text>
          <Text style={styles.coinCount}>{coins.toLocaleString()}</Text>
        </View>
      </LinearGradient>

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabItem, activeTab === tab.id && styles.tabItemActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab(tab.id);
            }}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {tab.count !== null && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{tab.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ═══ TEMALAR SEKME ═══ */}
        {activeTab === 'themes' && (
          <View>
            {/* Default theme option */}
            <TouchableOpacity
              style={[styles.defaultThemeBtn, activeTheme === 'default' && styles.defaultThemeBtnActive]}
              onPress={() => handleEquipTheme('default')}
            >
              <Text style={styles.defaultThemeBtnText}>
                {activeTheme === 'default' ? '✓ Varsayılan Tema (Aktif)' : 'Varsayılan Temaya Dön'}
              </Text>
            </TouchableOpacity>

            {/* Rarity filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
              {rarityFilters.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filterChip, filterRarity === f.id && styles.filterChipActive]}
                  onPress={() => setFilterRarity(f.id)}
                >
                  <Text style={[styles.filterChipText, { color: filterRarity === f.id ? '#fff' : f.color }]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Theme grid */}
            <View style={styles.themeGrid}>
              {filteredThemes.map((theme) => (
                <ThemePreviewCard
                  key={theme.id}
                  theme={theme}
                  isOwned={ownedThemes.includes(theme.id)}
                  isActive={activeTheme === theme.id}
                  coins={coins}
                  onBuy={() => handleBuyTheme(theme)}
                  onEquip={() => handleEquipTheme(theme.id)}
                />
              ))}
            </View>
          </View>
        )}

        {/* ═══ KOLEKSİYON SEKME ═══ */}
        {activeTab === 'collection' && (
          <View>
            <Text style={styles.sectionTitle}>
              🏆 Koleksiyon ({collectedCards.length}/{COLLECTIBLE_CARDS.length})
            </Text>
            <Text style={styles.sectionSubtitle}>
              Başarılarınla özel kartlar kazan!
            </Text>
            <View style={styles.collectibleGrid}>
              {COLLECTIBLE_CARDS.map((card) => (
                <CollectibleCardItem
                  key={card.id}
                  card={card}
                  isUnlocked={collectedCards.includes(card.id)}
                  progress={collectibleProgress[card.id] || 0}
                />
              ))}
            </View>
          </View>
        )}

        {/* ═══ KİŞİSELLEŞTİRME SEKME ═══ */}
        {activeTab === 'customize' && (
          <View>
            {/* Font Style */}
            <Text style={styles.sectionTitle}>✏️ Yazı Tipi</Text>
            <View style={styles.optionRow}>
              {(Object.keys(FONT_STYLES) as CardFontStyle[]).map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.optionChip,
                    cardCustomization.fontStyle === key && styles.optionChipActive,
                  ]}
                  onPress={() => handleCustomizationChange('fontStyle', key)}
                >
                  <Text style={[
                    styles.optionChipText,
                    cardCustomization.fontStyle === key && styles.optionChipTextActive,
                    key === 'serif' && { fontFamily: 'serif' },
                    key === 'mono' && { fontFamily: 'monospace' },
                  ]}>
                    {FONT_STYLES[key].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Border Style */}
            <Text style={styles.sectionTitle}>🔲 Çerçeve Stili</Text>
            <View style={styles.optionRow}>
              {(Object.keys(BORDER_STYLES) as CardBorderStyle[]).map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.optionChip,
                    cardCustomization.borderStyle === key && styles.optionChipActive,
                  ]}
                  onPress={() => handleCustomizationChange('borderStyle', key)}
                >
                  <Text style={[
                    styles.optionChipText,
                    cardCustomization.borderStyle === key && styles.optionChipTextActive,
                  ]}>
                    {BORDER_STYLES[key].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Toggle options */}
            <Text style={styles.sectionTitle}>🎛️ Görünüm Seçenekleri</Text>
            {[
              { key: 'showEmoji', label: 'Emoji Göster', desc: 'Kartlarda seviye emojisini göster' },
              { key: 'showProgressBar', label: 'İlerleme Çubuğu', desc: 'Hasat ilerlemesini göster' },
              { key: 'showLevel', label: 'Seviye Göster', desc: 'Kart seviyesini göster' },
              { key: 'compactMode', label: 'Kompakt Mod', desc: 'Kartları daha küçük göster' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={styles.toggleRow}
                onPress={() => handleCustomizationChange(
                  opt.key,
                  !cardCustomization[opt.key as keyof typeof cardCustomization]
                )}
              >
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>{opt.label}</Text>
                  <Text style={styles.toggleDesc}>{opt.desc}</Text>
                </View>
                <View style={[
                  styles.toggleSwitch,
                  cardCustomization[opt.key as keyof typeof cardCustomization] && styles.toggleSwitchOn,
                ]}>
                  <View style={[
                    styles.toggleKnob,
                    cardCustomization[opt.key as keyof typeof cardCustomization] && styles.toggleKnobOn,
                  ]} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════
// 🎨 STİLLER
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  coinIcon: { fontSize: 16, marginRight: 4 },
  coinCount: { fontSize: 16, fontWeight: '700', color: '#fef08a' },

  // Tab bar
  tabBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 52,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tabItemActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    borderColor: 'rgba(99, 102, 241, 0.5)',
    borderWidth: 1,
  },
  tabIcon: { fontSize: 16, marginRight: 6 },
  tabLabel: { fontSize: 13, color: '#9ca3af', fontWeight: '600' },
  tabLabelActive: { color: '#a5b4fc' },
  tabBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  tabBadgeText: { fontSize: 11, color: '#c7d2fe', fontWeight: '700' },

  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // Default theme button
  defaultThemeBtn: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
    alignItems: 'center',
  },
  defaultThemeBtnActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  defaultThemeBtnText: {
    color: '#d1d5db',
    fontSize: 14,
    fontWeight: '600',
  },

  // Rarity filter
  filterBar: {
    marginBottom: 12,
    maxHeight: 40,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderColor: 'rgba(99, 102, 241, 0.5)',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Theme grid
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  themeCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    marginBottom: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  themePreview: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  themeEmoji: { fontSize: 28, marginBottom: 2 },
  themePreviewWord: { fontSize: 16, fontWeight: '800' },
  themePreviewMeaning: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  themeBorderGlow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  themeInfo: {
    padding: 10,
  },
  themeNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  themeName: { fontSize: 14, fontWeight: '700', color: '#e5e7eb' },
  themeDesc: { fontSize: 11, color: '#9ca3af', marginBottom: 8 },
  rarityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rarityText: { fontSize: 9, fontWeight: '700' },

  // Theme buttons
  themeBtn: {
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: 'center',
  },
  themeBtnActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  themeBtnActiveText: { color: '#86efac', fontSize: 13, fontWeight: '700' },
  themeBtnEquip: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  themeBtnEquipText: { color: '#a5b4fc', fontSize: 13, fontWeight: '700' },
  themeBtnBuy: {
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.3)',
  },
  themeBtnBuyText: { color: '#fde047', fontSize: 13, fontWeight: '700' },
  themeBtnCantAfford: {
    backgroundColor: 'rgba(100,100,100,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(100,100,100,0.2)',
  },
  themeBtnCantAffordText: { color: '#6b7280', fontSize: 13, fontWeight: '700' },
  themeBtnLocked: {
    backgroundColor: 'rgba(100,100,100,0.1)',
  },
  themeBtnLockedText: { color: '#6b7280', fontSize: 11, fontWeight: '600' },

  // Collectible grid
  collectibleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  collectibleCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    padding: 12,
  },
  collectibleTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  collectibleEmoji: { fontSize: 28 },
  collectibleName: { fontSize: 14, fontWeight: '700', color: '#e5e7eb', marginBottom: 2 },
  collectibleNameLocked: { color: '#6b7280' },
  collectibleDesc: { fontSize: 11, color: '#9ca3af', marginBottom: 6 },
  collectibleProgressBg: {
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  collectibleProgressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 8,
  },
  collectibleProgressText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#d1d5db',
    textAlign: 'center',
  },

  // Section titles
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#e5e7eb',
    marginBottom: 6,
    marginTop: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 14,
  },

  // Customize options
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  optionChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderColor: 'rgba(99, 102, 241, 0.5)',
  },
  optionChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  optionChipTextActive: {
    color: '#a5b4fc',
  },

  // Toggle rows
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  toggleInfo: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 14, fontWeight: '700', color: '#e5e7eb' },
  toggleDesc: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(100,100,100,0.3)',
    padding: 3,
    justifyContent: 'center',
  },
  toggleSwitchOn: {
    backgroundColor: 'rgba(99, 102, 241, 0.5)',
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#6b7280',
  },
  toggleKnobOn: {
    backgroundColor: '#a5b4fc',
    alignSelf: 'flex-end',
  },
});
