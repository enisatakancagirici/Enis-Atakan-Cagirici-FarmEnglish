import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  Platform,
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
  DEFAULT_CUSTOMIZATION,
  getThemeOverlay,
  checkThemeUnlock,
  type CardThemeOverlay,
  type CollectibleCard,
  type CardRarity,
  type CardFontStyle,
  type CardBorderStyle,
  type CardBounceIntensity,
} from '../data/cardThemes';
import { normalizeDisplayText } from '../utils/textNormalization';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ShopTab = 'themes' | 'collection' | 'customize';

interface CardShopPanelProps {
  onClose?: () => void;
}

// ================================================================
//  TOPRAK RENK PALETI
// ================================================================
const SOIL_COLORS = {
  darkSoil: '#2C1810',
  richSoil: '#3E2723',
  mediumSoil: '#4E342E',
  lightSoil: '#5D4037',
  warmSoil: '#6D4C41',
  sandySoil: '#8D6E63',
  dirtAccent: '#A1887F',
  grassGreen: '#558B2F',
  leafGreen: '#33691E',
  wheat: '#F9A825',
  straw: '#FFD54F',
  root: '#795548',
  pebble: '#9E9E9E',
  clayOrange: '#BF360C',
};

type ShopPreviewFx = {
  glowColor: string;
  sweep: readonly [string, string, string];
  rainbow?: readonly [string, string, string, string];
  sparkle?: string;
  burstColor?: string;
  electricColor?: string;
  textureColor: string;
  frameRotation: string;
  frameScale: number;
};

const THEME_TEXTURE_LAYOUT = [
  { left: '8%', top: '12%', size: 3, opacity: 0.48 },
  { left: '20%', top: '34%', size: 5, opacity: 0.35 },
  { left: '35%', top: '20%', size: 4, opacity: 0.42 },
  { left: '48%', top: '60%', size: 3, opacity: 0.38 },
  { left: '62%', top: '18%', size: 5, opacity: 0.33 },
  { left: '74%', top: '40%', size: 3, opacity: 0.4 },
  { left: '86%', top: '26%', size: 4, opacity: 0.36 },
  { left: '14%', top: '72%', size: 4, opacity: 0.35 },
  { left: '56%', top: '78%', size: 3, opacity: 0.32 },
] as const;

const COLLECTIBLE_TEXTURE_LAYOUT = [
  { left: '10%', top: '16%', size: 3, opacity: 0.42 },
  { left: '28%', top: '40%', size: 4, opacity: 0.34 },
  { left: '46%', top: '24%', size: 3, opacity: 0.4 },
  { left: '64%', top: '58%', size: 4, opacity: 0.3 },
  { left: '80%', top: '36%', size: 3, opacity: 0.36 },
  { left: '22%', top: '74%', size: 4, opacity: 0.28 },
] as const;

const BURST_ANGLES = [-34, -18, -2, 14, 30, 46, 62, 78] as const;

const DEFAULT_SHOP_FX: ShopPreviewFx = {
  glowColor: '#f5d0fe',
  sweep: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0)'],
  sparkle: '#ffffff',
  textureColor: 'rgba(255,255,255,0.28)',
  frameRotation: '0deg',
  frameScale: 1,
};

const txt = (value: unknown, fallback = ''): string => {
  const normalized = normalizeDisplayText(value);
  return normalized || fallback;
};

const SHOP_PREVIEW_FX_BY_THEME: Record<string, ShopPreviewFx> = {
  minimal: {
    glowColor: '#e2e8f0',
    sweep: ['rgba(255,255,255,0)', 'rgba(226,232,240,0.62)', 'rgba(255,255,255,0)'],
    sparkle: '#f8fafc',
    textureColor: 'rgba(226,232,240,0.34)',
    frameRotation: '-1deg',
    frameScale: 0.98,
  },
  nature: {
    glowColor: '#22c55e',
    sweep: ['rgba(255,255,255,0)', 'rgba(134,239,172,0.62)', 'rgba(255,255,255,0)'],
    sparkle: '#bbf7d0',
    textureColor: 'rgba(134,239,172,0.3)',
    frameRotation: '-2deg',
    frameScale: 1.01,
  },
  ocean: {
    glowColor: '#38bdf8',
    sweep: ['rgba(255,255,255,0)', 'rgba(125,211,252,0.64)', 'rgba(255,255,255,0)'],
    sparkle: '#bae6fd',
    textureColor: 'rgba(125,211,252,0.32)',
    frameRotation: '1deg',
    frameScale: 1.01,
  },
  sunset: {
    glowColor: '#fb7185',
    sweep: ['rgba(255,255,255,0)', 'rgba(251,146,60,0.66)', 'rgba(255,255,255,0)'],
    sparkle: '#fdba74',
    burstColor: 'rgba(251,146,60,0.42)',
    textureColor: 'rgba(251,146,60,0.34)',
    frameRotation: '-2deg',
    frameScale: 1.02,
  },
  forest: {
    glowColor: '#4ade80',
    sweep: ['rgba(255,255,255,0)', 'rgba(74,222,128,0.6)', 'rgba(255,255,255,0)'],
    sparkle: '#bbf7d0',
    textureColor: 'rgba(110,231,183,0.26)',
    frameRotation: '-1deg',
    frameScale: 1.01,
  },
  cherry: {
    glowColor: '#f472b6',
    sweep: ['rgba(255,255,255,0)', 'rgba(244,114,182,0.68)', 'rgba(255,255,255,0)'],
    sparkle: '#fbcfe8',
    textureColor: 'rgba(244,114,182,0.3)',
    frameRotation: '2deg',
    frameScale: 1.03,
  },
  neon: {
    glowColor: '#00ffd5',
    sweep: ['rgba(255,255,255,0)', 'rgba(0,255,213,0.8)', 'rgba(255,255,255,0)'],
    sparkle: '#5eead4',
    electricColor: 'rgba(0,255,213,0.92)',
    burstColor: 'rgba(34,211,238,0.42)',
    textureColor: 'rgba(94,234,212,0.34)',
    frameRotation: '-3deg',
    frameScale: 1.06,
  },
  retro: {
    glowColor: '#f472b6',
    sweep: ['rgba(255,255,255,0)', 'rgba(236,72,153,0.76)', 'rgba(255,255,255,0)'],
    rainbow: ['rgba(236,72,153,0.24)', 'rgba(124,58,237,0.22)', 'rgba(244,114,182,0.2)', 'rgba(168,85,247,0.24)'],
    sparkle: '#f9a8d4',
    burstColor: 'rgba(236,72,153,0.38)',
    textureColor: 'rgba(244,114,182,0.33)',
    frameRotation: '-4deg',
    frameScale: 1.05,
  },
  galaxy: {
    glowColor: '#a5b4fc',
    sweep: ['rgba(255,255,255,0)', 'rgba(165,180,252,0.72)', 'rgba(255,255,255,0)'],
    rainbow: ['rgba(99,102,241,0.2)', 'rgba(168,85,247,0.22)', 'rgba(129,140,248,0.18)', 'rgba(59,130,246,0.2)'],
    sparkle: '#c7d2fe',
    textureColor: 'rgba(165,180,252,0.28)',
    frameRotation: '3deg',
    frameScale: 1.04,
  },
  crystal: {
    glowColor: '#bfdbfe',
    sweep: ['rgba(255,255,255,0)', 'rgba(191,219,254,0.76)', 'rgba(255,255,255,0)'],
    sparkle: '#dbeafe',
    burstColor: 'rgba(191,219,254,0.36)',
    textureColor: 'rgba(191,219,254,0.34)',
    frameRotation: '1deg',
    frameScale: 1.02,
  },
  amber: {
    glowColor: '#fbbf24',
    sweep: ['rgba(255,255,255,0)', 'rgba(251,191,36,0.74)', 'rgba(255,255,255,0)'],
    sparkle: '#fde68a',
    burstColor: 'rgba(245,158,11,0.4)',
    textureColor: 'rgba(251,191,36,0.34)',
    frameRotation: '-1deg',
    frameScale: 1.02,
  },
  voltstorm: {
    glowColor: '#22d3ee',
    sweep: ['rgba(255,255,255,0)', 'rgba(34,211,238,0.9)', 'rgba(255,255,255,0)'],
    rainbow: ['rgba(34,211,238,0.24)', 'rgba(6,182,212,0.26)', 'rgba(168,85,247,0.24)', 'rgba(45,212,191,0.22)'],
    sparkle: '#67e8f9',
    electricColor: 'rgba(34,211,238,1)',
    burstColor: 'rgba(168,85,247,0.46)',
    textureColor: 'rgba(103,232,249,0.4)',
    frameRotation: '-5deg',
    frameScale: 1.08,
  },
  dragon: {
    glowColor: '#fb7185',
    sweep: ['rgba(255,255,255,0)', 'rgba(248,113,113,0.76)', 'rgba(255,255,255,0)'],
    sparkle: '#fecaca',
    burstColor: 'rgba(239,68,68,0.45)',
    textureColor: 'rgba(248,113,113,0.36)',
    frameRotation: '-2deg',
    frameScale: 1.04,
  },
  phoenix: {
    glowColor: '#fbbf24',
    sweep: ['rgba(255,255,255,0)', 'rgba(251,191,36,0.78)', 'rgba(255,255,255,0)'],
    sparkle: '#fde68a',
    burstColor: 'rgba(251,146,60,0.46)',
    textureColor: 'rgba(251,191,36,0.36)',
    frameRotation: '4deg',
    frameScale: 1.06,
  },
  cyberpunk: {
    glowColor: '#22d3ee',
    sweep: ['rgba(255,255,255,0)', 'rgba(34,211,238,0.82)', 'rgba(255,255,255,0)'],
    rainbow: ['rgba(34,211,238,0.2)', 'rgba(236,72,153,0.26)', 'rgba(34,211,238,0.2)', 'rgba(236,72,153,0.24)'],
    sparkle: '#67e8f9',
    electricColor: 'rgba(236,72,153,0.95)',
    burstColor: 'rgba(34,211,238,0.44)',
    textureColor: 'rgba(34,211,238,0.34)',
    frameRotation: '-4deg',
    frameScale: 1.07,
  },
  aurora: {
    glowColor: '#34d399',
    sweep: ['rgba(255,255,255,0)', 'rgba(52,211,153,0.74)', 'rgba(255,255,255,0)'],
    rainbow: ['rgba(52,211,153,0.22)', 'rgba(56,189,248,0.22)', 'rgba(99,102,241,0.2)', 'rgba(16,185,129,0.22)'],
    sparkle: '#6ee7b7',
    textureColor: 'rgba(110,231,183,0.34)',
    frameRotation: '2deg',
    frameScale: 1.05,
  },
  diamond: {
    glowColor: '#67e8f9',
    sweep: ['rgba(255,255,255,0)', 'rgba(125,211,252,0.82)', 'rgba(255,255,255,0)'],
    rainbow: ['rgba(125,211,252,0.2)', 'rgba(45,212,191,0.22)', 'rgba(191,219,254,0.2)', 'rgba(125,211,252,0.2)'],
    sparkle: '#e0f2fe',
    burstColor: 'rgba(125,211,252,0.38)',
    textureColor: 'rgba(186,230,253,0.36)',
    frameRotation: '3deg',
    frameScale: 1.06,
  },
  royal: {
    glowColor: '#c084fc',
    sweep: ['rgba(255,255,255,0)', 'rgba(216,180,254,0.8)', 'rgba(255,255,255,0)'],
    rainbow: ['rgba(192,132,252,0.2)', 'rgba(139,92,246,0.24)', 'rgba(167,139,250,0.2)', 'rgba(192,132,252,0.22)'],
    sparkle: '#e9d5ff',
    burstColor: 'rgba(192,132,252,0.4)',
    textureColor: 'rgba(233,213,255,0.34)',
    frameRotation: '-2deg',
    frameScale: 1.05,
  },
  holographic: {
    glowColor: '#fde047',
    sweep: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0)'],
    rainbow: ['rgba(255,0,122,0.24)', 'rgba(0,194,255,0.24)', 'rgba(166,255,0,0.2)', 'rgba(255,189,0,0.24)'],
    sparkle: '#fef08a',
    electricColor: 'rgba(255,255,255,0.9)',
    burstColor: 'rgba(255,189,0,0.42)',
    textureColor: 'rgba(253,224,71,0.34)',
    frameRotation: '5deg',
    frameScale: 1.1,
  },
};

function getShopPreviewFx(themeId: string): ShopPreviewFx {
  return SHOP_PREVIEW_FX_BY_THEME[themeId] || DEFAULT_SHOP_FX;
}

type CollectiblePreviewFx = {
  gradient: readonly [string, string, string];
  glowColor: string;
  textureColor: string;
  burstColor: string;
};

const COLLECTIBLE_FX_BY_RARITY: Record<CardRarity, CollectiblePreviewFx> = {
  common: {
    gradient: ['#111827', '#1f2937', '#111827'],
    glowColor: '#9ca3af',
    textureColor: 'rgba(209,213,219,0.24)',
    burstColor: 'rgba(156,163,175,0.32)',
  },
  rare: {
    gradient: ['#0f172a', '#1e3a8a', '#0f172a'],
    glowColor: '#60a5fa',
    textureColor: 'rgba(147,197,253,0.28)',
    burstColor: 'rgba(59,130,246,0.34)',
  },
  epic: {
    gradient: ['#3b0764', '#6d28d9', '#3b0764'],
    glowColor: '#c084fc',
    textureColor: 'rgba(216,180,254,0.3)',
    burstColor: 'rgba(168,85,247,0.36)',
  },
  legendary: {
    gradient: ['#3f2600', '#92400e', '#3f2600'],
    glowColor: '#fbbf24',
    textureColor: 'rgba(253,224,71,0.34)',
    burstColor: 'rgba(245,158,11,0.38)',
  },
};

const COLLECTIBLE_FX_OVERRIDES: Record<string, Partial<CollectiblePreviewFx>> = {
  combo_100: { gradient: ['#0f172a', '#164e63', '#312e81'], glowColor: '#22d3ee', burstColor: 'rgba(34,211,238,0.46)' },
  battle_champion: { gradient: ['#450a0a', '#9f1239', '#581c87'], glowColor: '#f472b6', burstColor: 'rgba(244,114,182,0.44)' },
  streak_100: { gradient: ['#172554', '#3730a3', '#1d4ed8'], glowColor: '#818cf8', burstColor: 'rgba(129,140,248,0.4)' },
  millionaire: { gradient: ['#422006', '#78350f', '#854d0e'], glowColor: '#f59e0b', burstColor: 'rgba(245,158,11,0.42)' },
};

function getCollectiblePreviewFx(card: CollectibleCard): CollectiblePreviewFx {
  const base = COLLECTIBLE_FX_BY_RARITY[card.rarity];
  const override = COLLECTIBLE_FX_OVERRIDES[card.id];
  return override ? { ...base, ...override } : base;
}

// ================================================================
// Kart Onizleme Bileseni
// ================================================================
const ThemePreviewCard: React.FC<{
  theme: CardThemeOverlay;
  isOwned: boolean;
  isActive: boolean;
  isUnlockable: boolean;
  coins: number;
  onBuy: () => void;
  onEquip: () => void;
  onClaim: () => void;
}> = React.memo(({ theme, isOwned, isActive, isUnlockable, coins, onBuy, onEquip, onClaim }) => {
  const rarity = RARITY_COLORS[theme.rarity];
  const canAfford = theme.price === 0 || coins >= theme.price;
  const previewFx = useMemo(() => getShopPreviewFx(theme.id), [theme.id]);

  return (
    <View style={[styles.themeCard, { borderColor: rarity.border }]}>
      <LinearGradient
        colors={theme.previewGradient as [string, string, string]}
        style={styles.themePreview}
      >
        <View style={styles.themePreviewTextureLayer}>
          {THEME_TEXTURE_LAYOUT.map((dot, i) => (
            <View
              key={i}
              style={[
                styles.themePreviewTextureDot,
                {
                  left: dot.left,
                  top: dot.top,
                  width: dot.size,
                  height: dot.size,
                  opacity: dot.opacity,
                  backgroundColor: previewFx.textureColor,
                },
              ]}
            />
          ))}
        </View>
        <View
          style={[
            styles.themePreviewFrame,
            {
              borderColor: previewFx.glowColor,
              transform: [{ rotate: previewFx.frameRotation }, { scale: previewFx.frameScale }],
            },
          ]}
        />
        <LinearGradient
          colors={[...theme.gradientTint] as [string, string]}
          style={[StyleSheet.absoluteFill, { opacity: 0.52 }]}
        />
        {previewFx.rainbow && (
          <LinearGradient
            colors={[...previewFx.rainbow] as [string, string, string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { opacity: 0.9 }]}
          />
        )}
        <View style={[styles.themePreviewAura, { borderColor: previewFx.glowColor, shadowColor: previewFx.glowColor }]} />
        <View style={[styles.themePreviewSweep, { transform: [{ translateX: 32 }, { skewX: '-16deg' }, { rotate: previewFx.frameRotation }] }]}>
          <LinearGradient
            colors={[...previewFx.sweep] as [string, string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        {previewFx.burstColor && (
          <View style={styles.themePreviewBurstLayer} pointerEvents="none">
            {BURST_ANGLES.map((angle, idx) => (
              <View
                key={`burst-${idx}`}
                style={[
                  styles.themePreviewBurstRay,
                  {
                    backgroundColor: previewFx.burstColor,
                    transform: [{ rotate: `${angle}deg` }],
                  },
                ]}
              />
            ))}
          </View>
        )}
        {previewFx.electricColor && (
          <>
            <View style={[styles.themePreviewElectricArc, { top: 18, left: 18, borderColor: previewFx.electricColor, transform: [{ rotate: '-14deg' }] }]} />
            <View style={[styles.themePreviewElectricArc, { top: 30, right: 16, borderColor: previewFx.electricColor, transform: [{ rotate: '18deg' }] }]} />
            <View style={[styles.themePreviewElectricArc, { bottom: 20, left: 38, borderColor: previewFx.electricColor, transform: [{ rotate: '-4deg' }] }]} />
          </>
        )}
        {previewFx.sparkle && (
          <>
            <View style={[styles.themePreviewSpark, { left: '14%', top: '18%', backgroundColor: previewFx.sparkle, shadowColor: previewFx.sparkle }]} />
            <View style={[styles.themePreviewSpark, { left: '82%', top: '26%', width: 4, height: 4, borderRadius: 2, backgroundColor: previewFx.sparkle, shadowColor: previewFx.sparkle }]} />
            <View style={[styles.themePreviewSpark, { left: '69%', top: '70%', width: 5, height: 5, borderRadius: 2.5, backgroundColor: previewFx.sparkle, shadowColor: previewFx.sparkle }]} />
          </>
        )}
        <View style={[styles.themePreviewCore, { borderColor: theme.borderColor }]} />
        <Text style={styles.themeEmoji}>{txt(theme.emoji)}</Text>
        <Text style={[styles.themePreviewWord, { color: theme.borderGlow }]}>
          {txt('Example')}
        </Text>
        <Text style={[styles.themePreviewMeaning, { color: theme.borderColor }]}>
          {txt('Örnek')}
        </Text>
        {/* Border glow effect */}
        <View style={[styles.themeBorderGlow, {
          borderColor: theme.borderColor,
          shadowColor: previewFx.glowColor,
        }]} />
      </LinearGradient>

      <View style={styles.themeInfo}>
        <View style={styles.themeNameRow}>
          <Text style={styles.themeName}>{txt(theme.name)}</Text>
          <View style={[styles.rarityBadge, { backgroundColor: rarity.bg }]}>
            <Text style={[styles.rarityText, { color: rarity.text }]}>
              {txt(rarity.label)}
            </Text>
          </View>
        </View>
        <Text style={styles.themeDesc}>{txt(theme.description)}</Text>

        {/* Action button */}
        {isActive ? (
          <View style={[styles.themeBtn, styles.themeBtnActive]}>
            <Text style={styles.themeBtnActiveText}>{txt('✓ Aktif')}</Text>
          </View>
        ) : isOwned ? (
          <TouchableOpacity
            style={[styles.themeBtn, styles.themeBtnEquip]}
            onPress={onEquip}
          >
            <Text style={styles.themeBtnEquipText}>{txt('Kullan')}</Text>
          </TouchableOpacity>
        ) : theme.price === 0 && isUnlockable ? (
          // art sağlanmış - hemen al butonu
          <TouchableOpacity
            style={[styles.themeBtn, styles.themeBtnClaim]}
            onPress={onClaim}
          >
            <Text style={styles.themeBtnClaimText}>{txt('🎉 Hemen Al!')}</Text>
          </TouchableOpacity>
        ) : theme.price === 0 ? (
          // art henüz sağlanmamış
          <View style={[styles.themeBtn, styles.themeBtnLocked]}>
            <Text style={styles.themeBtnLockedText}>
              {txt(`🔒 ${theme.unlockDescription || 'Başarı ile aç'}`)}
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
              {txt(`💰 ${theme.price.toLocaleString()}`)}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});
ThemePreviewCard.displayName = 'ThemePreviewCard';

// ================================================================
//  Koleksiyon Karti Bileseni
// ================================================================
const CollectibleCardItem: React.FC<{
  card: CollectibleCard;
  isUnlocked: boolean;
  progress: number;
  onCollect?: (cardId: string) => void;
  isThemeOwned?: boolean;
  rewardThemeName?: string;
  onClaimTheme?: () => void;
  onEquipTheme?: () => void;
}> = React.memo(({ card, isUnlocked, progress, onCollect, isThemeOwned = false, rewardThemeName, onClaimTheme, onEquipTheme }) => {
  const rarity = RARITY_COLORS[card.rarity];
  const progressPct = Math.min(progress / card.unlockTarget, 1);
  const conditionMet = progress >= card.unlockTarget;
  const collectibleFx = useMemo(() => getCollectiblePreviewFx(card), [card.id, card.rarity]);
  const collectibleGradient = isUnlocked
    ? collectibleFx.gradient
    : conditionMet
      ? [collectibleFx.gradient[1], collectibleFx.gradient[0], collectibleFx.gradient[1]] as [string, string, string]
      : ['#111827', '#1f2937', '#111827'] as [string, string, string];

  return (
    <View style={[styles.collectibleCard, {
      borderColor: isUnlocked ? rarity.border : conditionMet ? SOIL_COLORS.wheat : 'rgba(100,100,100,0.3)',
      opacity: isUnlocked ? 1 : conditionMet ? 1 : 0.7,
    }]}>
      <LinearGradient
        colors={collectibleGradient}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.collectibleAura,
          {
            borderColor: collectibleFx.glowColor,
            shadowColor: collectibleFx.glowColor,
            opacity: isUnlocked ? 0.95 : conditionMet ? 0.7 : 0.45,
          },
        ]}
      />
      <View style={styles.collectibleTextureLayer}>
        {COLLECTIBLE_TEXTURE_LAYOUT.map((dot, i) => (
          <View
            key={i}
            style={[
              styles.collectibleTextureDot,
              {
                left: dot.left,
                top: dot.top,
                width: dot.size,
                height: dot.size,
                opacity: dot.opacity,
                backgroundColor: collectibleFx.textureColor,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.collectibleBurstLayer}>
        {BURST_ANGLES.slice(0, 6).map((angle, idx) => (
          <View
            key={`collectible-burst-${idx}`}
            style={[
              styles.collectibleBurstRay,
              {
                backgroundColor: collectibleFx.burstColor,
                transform: [{ rotate: `${angle}deg` }],
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.collectibleTop}>
        <Text style={styles.collectibleEmoji}>
          {isUnlocked ? txt(card.emoji) : conditionMet ? txt('🎁') : txt('🔒')}
        </Text>
        <View style={[styles.rarityBadge, { backgroundColor: rarity.bg }]}>
          <Text style={[styles.rarityText, { color: rarity.text }]}>
            {txt(rarity.label)}
          </Text>
        </View>
      </View>
      <Text style={[styles.collectibleName, !isUnlocked && !conditionMet && styles.collectibleNameLocked]}>
        {isUnlocked ? txt(card.name) : conditionMet ? txt(card.name) : txt('???')}
      </Text>
      <Text style={styles.collectibleDesc}>
        {isUnlocked ? txt(card.description) : conditionMet ? txt('✅ Şart sağlandı!') : txt(card.unlockCondition)}
      </Text>
      {/* Unlocked badge */}
      {isUnlocked && (
        <View style={styles.collectibleUnlockedBadge}>
          <Text style={styles.collectibleUnlockedText}>{txt('✓ Koleksiyonda')}</Text>
        </View>
      )}
      {isUnlocked && card.rewardThemeId && (
        <View style={styles.collectibleThemeReward}>
          <Text style={styles.collectibleThemeRewardText}>
            {txt(`🎨 Tema: ${rewardThemeName || card.rewardThemeId}`)}
          </Text>
        </View>
      )}
      {isUnlocked && card.rewardThemeId && isThemeOwned && onEquipTheme && (
        <TouchableOpacity
          style={styles.collectibleEquipBtn}
          onPress={onEquipTheme}
          activeOpacity={0.7}
        >
          <Text style={styles.collectibleEquipText}>{txt('🎨 Tasarımı Kullan')}</Text>
        </TouchableOpacity>
      )}
      {isUnlocked && card.rewardThemeId && !isThemeOwned && onClaimTheme && (
        <TouchableOpacity
          style={styles.collectibleClaimBtn}
          onPress={onClaimTheme}
          activeOpacity={0.7}
        >
          <Text style={styles.collectibleClaimText}>{txt('🎁 Tasarımı Al')}</Text>
        </TouchableOpacity>
      )}
      {/* Collect button -- condition met but not yet collected */}
      {!isUnlocked && conditionMet && onCollect && (
        <TouchableOpacity
          style={styles.collectibleClaimBtn}
          onPress={() => onCollect(card.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.collectibleClaimText}>{txt('🎉 Topla!')}</Text>
        </TouchableOpacity>
      )}
      {/* Progress bar -- only for not-yet-met conditions */}
      {!isUnlocked && !conditionMet && (
        <View style={styles.collectibleProgressBg}>
          <View style={[styles.collectibleProgressFill, {
            width: `${progressPct * 100}%`,
            backgroundColor: rarity.border,
          }]} />
          <Text style={styles.collectibleProgressText}>
            {txt(`${progress}/${card.unlockTarget}`)}
          </Text>
        </View>
      )}
    </View>
  );
});
CollectibleCardItem.displayName = 'CollectibleCardItem';

// ================================================================
//  ANA BILESEN
// ================================================================
export const CardShopPanel: React.FC<CardShopPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<ShopTab>('themes');
  const [filterRarity, setFilterRarity] = useState<CardRarity | 'all'>('all');

  // Store data selectors
  const coins = useFarmStore(s => s.coins);
  const ownedThemes = useFarmStore(s => s.ownedCardThemes);
  const activeTheme = useFarmStore(s => s.activeCardTheme);
  const collectedCards = useFarmStore(s => s.collectedCards);
  const cardCustomization = useFarmStore(s => s.cardCustomization);

  // Panel açıldığında koleksiyon kartlarını kontrol et
  useEffect(() => {
    const newCards = useFarmStore.getState().checkCollectibleCards();
    if (newCards.length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  // Stats for unlock checks -- individual primitives avoid new-object-per-render
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
        Alert.alert(
          txt('🔒 Kilitli'),
          txt(theme.unlockDescription || 'Bu temayı açmak için başarıyı tamamla')
        );
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
      txt(`${theme.emoji} ${theme.name}`),
      txt(`Bu temayı ${theme.price.toLocaleString()} coin'e satın almak istiyor musun?`),
      [
        { text: txt('İptal'), style: 'cancel' },
        {
          text: txt(`💰 ${theme.price.toLocaleString()} Satın Al`),
          onPress: () => {
            const success = useFarmStore.getState().purchaseCardTheme(theme.id);
            if (success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert(
                txt('Yetersiz Coin'),
                txt('Bu temayı almak için yeterli coinin yok')
              );
            }
          },
        },
      ]
    );
  }, [stats]);

  const handleEquipTheme = useCallback((themeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const store = useFarmStore.getState();
    store.setActiveCardTheme(themeId);

    // "Varsayılan"a dönünce tüm kişiselleştirmeyi ilk haline sıfırla
    if (themeId === 'default') {
      store.updateCardCustomization({ ...DEFAULT_CUSTOMIZATION });
    }
  }, []);

  // artı sağlanmış achievement temayı ücretsiz al
  const handleClaimTheme = useCallback((theme: CardThemeOverlay) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const success = useFarmStore.getState().purchaseCardTheme(theme.id);
    if (success) {
      Alert.alert(
        txt('🎉 Tebrikler!'),
        txt(`${theme.emoji} ${theme.name} teması açıldı ve aktif edildi!`)
      );
    }
  }, []);

  // Koleksiyon kartını topla
  const handleCollectCard = useCallback((cardId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // checkCollectibleCards tüm eligible kartları toplar
    const newCards = useFarmStore.getState().checkCollectibleCards();
    if (newCards.length > 0) {
      const card = COLLECTIBLE_CARDS.find(c => c.id === cardId);
      Alert.alert(
        txt('🎉 Kart Toplandı!'),
        txt(`${card?.emoji || '🏆'} ${card?.name || 'Kart'} koleksiyonuna eklendi!`)
      );
    } else {
      // checkCollectibleCards bulmadıysa, manuel olarak ekle
      const state = useFarmStore.getState();
      if (!state.collectedCards.includes(cardId)) {
        const card = COLLECTIBLE_CARDS.find(c => c.id === cardId);
        const rewardThemeId = card?.rewardThemeId;
        const shouldUnlockTheme = !!(
          rewardThemeId &&
          getThemeOverlay(rewardThemeId) &&
          !state.ownedCardThemes.includes(rewardThemeId)
        );

        useFarmStore.setState({
          collectedCards: [...state.collectedCards, cardId],
          ownedCardThemes: shouldUnlockTheme && rewardThemeId
            ? [...state.ownedCardThemes, rewardThemeId]
            : state.ownedCardThemes,
        });
        Alert.alert(
          txt('🎉 Kart Toplandı!'),
          txt(`${card?.emoji || '🏆'} ${card?.name || 'Kart'} koleksiyonuna eklendi!`)
        );
      }
    }
  }, []);

  const handleClaimCollectibleTheme = useCallback((card: CollectibleCard) => {
    if (!card.rewardThemeId) return;
    const rewardTheme = getThemeOverlay(card.rewardThemeId);
    if (!rewardTheme) return;

    const state = useFarmStore.getState();
    if (state.ownedCardThemes.includes(rewardTheme.id)) {
      handleEquipTheme(rewardTheme.id);
      return;
    }

    useFarmStore.setState({
      ownedCardThemes: [...state.ownedCardThemes, rewardTheme.id],
      activeCardTheme: rewardTheme.id,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      txt('Tema Açıldı'),
      txt(`${rewardTheme.emoji} ${rewardTheme.name} artık kullanıma hazır!`)
    );
  }, [handleEquipTheme]);

  // Tema için unlock kontrolü (her tema için hesapla)
  const themeUnlockMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const theme of CARD_THEME_OVERLAYS) {
      if (theme.price === 0 && theme.unlockRequirement) {
        map[theme.id] = checkThemeUnlock(theme.id, stats);
      }
    }
    return map;
  }, [stats]);

  const handleCustomizationChange = useCallback((key: string, value: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (key === 'compactMode') {
      useFarmStore.getState().updateCardCustomization({
        compactMode: !!value,
        largeMode: value ? false : useFarmStore.getState().cardCustomization.largeMode,
      });
      return;
    }
    if (key === 'largeMode') {
      useFarmStore.getState().updateCardCustomization({
        largeMode: !!value,
        compactMode: value ? false : useFarmStore.getState().cardCustomization.compactMode,
      });
      return;
    }
    useFarmStore.getState().updateCardCustomization({ [key]: value });
  }, []);

  const tabs = useMemo(() => [
    { id: 'themes' as ShopTab, label: txt('Temalar'), icon: txt('🎨'), count: CARD_THEME_OVERLAYS.length },
    { id: 'collection' as ShopTab, label: txt('Koleksiyon'), icon: txt('🏆'), count: txt(`${collectedCards.length}/${COLLECTIBLE_CARDS.length}`) },
    { id: 'customize' as ShopTab, label: txt('Kişiselleştir'), icon: txt('⚙️'), count: null },
  ], [collectedCards.length]);

  const rarityFilters: { id: CardRarity | 'all'; label: string; color: string }[] = [
    { id: 'all', label: txt('Hepsi'), color: '#fff' },
    { id: 'common', label: txt('Sıradan'), color: RARITY_COLORS.common.text },
    { id: 'rare', label: txt('Nadir'), color: RARITY_COLORS.rare.text },
    { id: 'epic', label: txt('Epik'), color: RARITY_COLORS.epic.text },
    { id: 'legendary', label: txt('Efsanevi'), color: RARITY_COLORS.legendary.text },
  ];

  return (
    <View style={styles.container}>
      {/* Header - Toprak tonlu gradient */}
      <LinearGradient
        colors={[SOIL_COLORS.richSoil, SOIL_COLORS.lightSoil, SOIL_COLORS.warmSoil]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>{txt('🌾 Kart Pazarı')}</Text>
        <View style={styles.headerRight}>
          <View style={styles.coinContainer}>
          <Text style={styles.coinIcon}>{txt('💰')}</Text>
          <Text style={styles.coinCount}>{coins.toLocaleString()}</Text>
          </View>
          {/* ✕ KAPAT BUTONU */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onClose?.();
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.closeButtonText}>{txt('✕')}</Text>
          </TouchableOpacity>
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
        {/* === TEMALAR SEKME === */}
        {activeTab === 'themes' && (
          <View>
            {/* Default theme option */}
            <TouchableOpacity
              style={[styles.defaultThemeBtn, activeTheme === 'default' && styles.defaultThemeBtnActive]}
              onPress={() => handleEquipTheme('default')}
            >
              <Text style={styles.defaultThemeBtnText}>
                {activeTheme === 'default'
                  ? txt('✓ Varsayılan Tema (Aktif)')
                  : txt('Varsayılan Temaya Dön')}
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
                  isUnlockable={!!(theme.price === 0 && theme.unlockRequirement && themeUnlockMap[theme.id])}
                  coins={coins}
                  onBuy={() => handleBuyTheme(theme)}
                  onEquip={() => handleEquipTheme(theme.id)}
                  onClaim={() => handleClaimTheme(theme)}
                />
              ))}
            </View>
          </View>
        )}

        {/*  KOLEKSİYON SEKME  */}
        {activeTab === 'collection' && (
          <View>
            <Text style={styles.sectionTitle}>
              {txt(`🏆 Koleksiyon (${collectedCards.length}/${COLLECTIBLE_CARDS.length})`)}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {txt('Başarılarınla özel kartlar kazan!')}
            </Text>
            <View style={styles.collectibleGrid}>
              {COLLECTIBLE_CARDS.map((card) => {
                const rewardTheme = card.rewardThemeId ? getThemeOverlay(card.rewardThemeId) : undefined;
                const isThemeOwned = !!(rewardTheme && ownedThemes.includes(rewardTheme.id));

                return (
                  <CollectibleCardItem
                    key={card.id}
                    card={card}
                    isUnlocked={collectedCards.includes(card.id)}
                    progress={collectibleProgress[card.id] || 0}
                    onCollect={handleCollectCard}
                    isThemeOwned={isThemeOwned}
                    rewardThemeName={rewardTheme?.name}
                    onClaimTheme={() => handleClaimCollectibleTheme(card)}
                    onEquipTheme={rewardTheme ? () => handleEquipTheme(rewardTheme.id) : undefined}
                  />
                );
              })}
            </View>
          </View>
        )}

        {/*  KİİSELLETİRME SEKME  */}
        {activeTab === 'customize' && (
          <View>
            {/* Font Style */}
            <Text style={styles.sectionTitle}>{txt('✏️ Yazı Tipi')}</Text>
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
                    {txt(FONT_STYLES[key].label)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Border Style */}
            <Text style={styles.sectionTitle}>{txt('🔲 Çerçeve Stili')}</Text>
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
                    {txt(BORDER_STYLES[key].label)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Toggle options */}
            <Text style={styles.sectionTitle}>{txt('🎛️ Görünüm Seçenekleri')}</Text>
            {[
              { key: 'showEmoji', label: txt('Emoji Göster'), desc: txt('Kartlarda seviye emojisini göster') },
              { key: 'showProgressBar', label: txt('İlerleme Çubuğu'), desc: txt('Hasat ilerlemesini göster') },
              { key: 'showLevel', label: txt('Seviye Göster'), desc: txt('Kart seviyesini göster') },
              { key: 'compactMode', label: txt('Kompakt Mod'), desc: txt('Kartları daha küçük göster') },
              { key: 'largeMode', label: txt('Büyük Kart Modu'), desc: txt('Kartları daha büyük göster') },
              { key: 'enableCardGlow', label: txt('Parlama Efekti'), desc: txt('Glow, aura ve parlayan kenar efektlerini aç/kapat') },
              { key: 'enableCardBounce', label: txt('Zıplama Efekti'), desc: txt('Kart pulse ve bounce hareketlerini aç/kapat') },
              { key: 'enableCardBurstFx', label: txt('Sıçrama Efekti'), desc: txt('Hasat sırasında su/böcek/splash efektlerini aç/kapat') },
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

            <Text style={styles.sectionTitle}>{txt('Zıplama Şiddeti')}</Text>
            <View style={styles.optionRow}>
              {([
                { key: 'min', label: txt('Min'), desc: txt('Daha sakin, düşük amplitude') },
                { key: 'normal', label: txt('Normal'), desc: txt('Dengeli hareket') },
                { key: 'max', label: txt('Max'), desc: txt('Daha güçlü ve hızlı bounce') },
              ] as { key: CardBounceIntensity; label: string; desc: string }[]).map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.optionChip,
                    cardCustomization.cardBounceIntensity === option.key && styles.optionChipActive,
                  ]}
                  onPress={() => handleCustomizationChange('cardBounceIntensity', option.key)}
                >
                  <Text style={[
                    styles.optionChipText,
                    cardCustomization.cardBounceIntensity === option.key && styles.optionChipTextActive,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.sectionSubtitle}>
              {txt('Min: sakin • Normal: dengeli • Max: güçlü bounce')}
            </Text>
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

// ================================================================
//  STILLER
// ================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SOIL_COLORS.darkSoil,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomWidth: 2,
    borderBottomColor: SOIL_COLORS.grassGreen,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: SOIL_COLORS.straw,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(249,168,37,0.3)',
  },
  coinIcon: { fontSize: 16, marginRight: 4 },
  coinCount: { fontSize: 16, fontWeight: '700', color: SOIL_COLORS.straw },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 20,
  },

  // Tab bar
  tabBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 52,
    backgroundColor: 'rgba(62,39,35,0.5)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(141,110,99,0.2)',
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(93,64,55,0.4)',
  },
  tabItemActive: {
    backgroundColor: 'rgba(85,139,47,0.35)',
    borderColor: 'rgba(85,139,47,0.6)',
    borderWidth: 1,
  },
  tabIcon: { fontSize: 16, marginRight: 6 },
  tabLabel: { fontSize: 13, color: SOIL_COLORS.dirtAccent, fontWeight: '600' },
  tabLabelActive: { color: SOIL_COLORS.straw },
  tabBadge: {
    backgroundColor: 'rgba(85,139,47,0.45)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  tabBadgeText: { fontSize: 11, color: SOIL_COLORS.straw, fontWeight: '700' },

  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // Default theme button
  defaultThemeBtn: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(93,64,55,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(141,110,99,0.3)',
    marginBottom: 12,
    alignItems: 'center',
  },
  defaultThemeBtnActive: {
    backgroundColor: 'rgba(85,139,47,0.25)',
    borderColor: 'rgba(85,139,47,0.5)',
  },
  defaultThemeBtnText: {
    color: SOIL_COLORS.dirtAccent,
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
    backgroundColor: 'rgba(93,64,55,0.4)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(141,110,99,0.25)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(85,139,47,0.3)',
    borderColor: 'rgba(85,139,47,0.6)',
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
    backgroundColor: SOIL_COLORS.richSoil,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  themePreview: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  themePreviewTextureLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  themePreviewTextureDot: {
    position: 'absolute',
    borderRadius: 999,
  },
  themePreviewFrame: {
    position: 'absolute',
    top: 8,
    right: 8,
    bottom: 8,
    left: 8,
    borderRadius: 14,
    borderWidth: 1.2,
    opacity: 0.65,
  },
  themePreviewCore: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    opacity: 0.24,
  },
  themePreviewBurstLayer: {
    position: 'absolute',
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  themePreviewBurstRay: {
    position: 'absolute',
    width: 30,
    height: 2.5,
    borderRadius: 2,
    opacity: 0.62,
  },
  themePreviewElectricArc: {
    position: 'absolute',
    width: 22,
    height: 10,
    borderTopWidth: 2,
    borderRadius: 16,
    opacity: 0.9,
  },
  themeEmoji: { fontSize: 28, marginBottom: 2 },
  themePreviewWord: { fontSize: 16, fontWeight: '800' },
  themePreviewMeaning: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  themePreviewAura: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.4,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
  },
  themePreviewSweep: {
    position: 'absolute',
    top: -18,
    bottom: -18,
    width: 52,
    transform: [{ translateX: 38 }, { skewX: '-18deg' }],
    opacity: 0.9,
  },
  themePreviewSpark: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 8,
  },
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
  themeBtnClaim: {
    backgroundColor: 'rgba(85,139,47,0.35)',
    borderWidth: 1.5,
    borderColor: 'rgba(85,139,47,0.7)',
  },
  themeBtnClaimText: { color: SOIL_COLORS.straw, fontSize: 13, fontWeight: '800' },
  themeBtnLocked: {
    backgroundColor: 'rgba(44,24,16,0.5)',
  },
  themeBtnLockedText: { color: SOIL_COLORS.sandySoil, fontSize: 11, fontWeight: '600' },

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
    backgroundColor: '#111827',
    borderWidth: 1,
    padding: 12,
    overflow: 'hidden',
  },
  collectibleAura: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.2,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 14,
  },
  collectibleTextureLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  collectibleTextureDot: {
    position: 'absolute',
    borderRadius: 999,
  },
  collectibleBurstLayer: {
    position: 'absolute',
    top: 16,
    right: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.82,
    pointerEvents: 'none',
  },
  collectibleBurstRay: {
    position: 'absolute',
    width: 20,
    height: 2,
    borderRadius: 2,
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
  collectibleUnlockedBadge: {
    backgroundColor: 'rgba(85,139,47,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(85,139,47,0.5)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginTop: 2,
  },
  collectibleUnlockedText: { fontSize: 11, fontWeight: '700', color: '#86efac' },
  collectibleThemeReward: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(59,130,246,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.35)',
  },
  collectibleThemeRewardText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#bfdbfe',
    textAlign: 'center',
  },
  collectibleEquipBtn: {
    backgroundColor: 'rgba(99,102,241,0.35)',
    borderWidth: 1.5,
    borderColor: 'rgba(129,140,248,0.65)',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  collectibleEquipText: { fontSize: 13, fontWeight: '800', color: '#e0e7ff' },
  collectibleClaimBtn: {
    backgroundColor: 'rgba(85,139,47,0.4)',
    borderWidth: 1.5,
    borderColor: 'rgba(85,139,47,0.7)',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  collectibleClaimText: { fontSize: 13, fontWeight: '800', color: SOIL_COLORS.straw },
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
    color: SOIL_COLORS.straw,
    marginBottom: 6,
    marginTop: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: SOIL_COLORS.dirtAccent,
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
    backgroundColor: 'rgba(93,64,55,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(141,110,99,0.25)',
  },
  optionChipActive: {
    backgroundColor: 'rgba(85,139,47,0.3)',
    borderColor: 'rgba(85,139,47,0.6)',
  },
  optionChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: SOIL_COLORS.dirtAccent,
  },
  optionChipTextActive: {
    color: SOIL_COLORS.straw,
  },

  // Toggle rows
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(141,110,99,0.15)',
  },
  toggleInfo: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 14, fontWeight: '700', color: '#e5e7eb' },
  toggleDesc: { fontSize: 11, color: SOIL_COLORS.dirtAccent, marginTop: 2 },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(93,64,55,0.5)',
    padding: 3,
    justifyContent: 'center',
  },
  toggleSwitchOn: {
    backgroundColor: 'rgba(85,139,47,0.5)',
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: SOIL_COLORS.sandySoil,
  },
  toggleKnobOn: {
    backgroundColor: SOIL_COLORS.straw,
    alignSelf: 'flex-end',
  },
});
