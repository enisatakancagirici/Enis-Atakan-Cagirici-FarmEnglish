/**
 * 🎨 COLOR SCHEMES - Web'deki Tailwind gradient/badge/bar stilleri RN karşılığı
 * Her tema için: bg gradient, badge, bar, button, shadow/border
 */

import { COLORS, withOpacity } from '../tokens/colors';

export interface ColorScheme {
  // Ana kart background gradient
  bgGradient: readonly string[];
  bgGradientDirection: { start: { x: number; y: number }; end: { x: number; y: number } };
  
  // Glass overlay
  glassOverlay: string;
  
  // Border & glow
  border: string;
  borderGlow: string;
  shadowColor: string;
  
  // Ready state (harvest ready)
  readyBorder: string;
  readyShadow: string;
  
  // Badge styling
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  
  // Progress bar
  barTrackBg: string;
  barTrackBorder: string;
  barFillGradient: readonly string[];
  barOverlayGradient: readonly string[];
  
  // CTA Button
  buttonGradient: readonly string[];
  buttonPressedGradient: readonly string[];
  buttonText: string;
  buttonShadow: string;
  
  // Text colors
  textMain: string;
  textSecondary: string;
  textMuted: string;
  
  // Special elements
  emoji: string;
  label: string;
  
  // Master shine/shimmer (only for master/ultra/perfect)
  shimmerColors?: readonly string[];
  glowIntensity?: number;
}

/**
 * 🌈 COLOR_SCHEMES - 7 tema: green, yellow, orange, red, master, ultra, perfect
 */
export const COLOR_SCHEMES: Record<string, ColorScheme> = {
  // 🟢 GREEN - Temiz, hazır hasat
  green: {
    bgGradient: [
      withOpacity(COLORS.green[900], 0.95),
      withOpacity(COLORS.emerald[800], 0.92),
      withOpacity(COLORS.green[900], 0.95),
    ],
    bgGradientDirection: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    glassOverlay: withOpacity(COLORS.white, 0.08),
    border: withOpacity(COLORS.green[500], 0.7),
    borderGlow: COLORS.green[500],
    shadowColor: COLORS.green[600],
    readyBorder: COLORS.green[400],
    readyShadow: withOpacity(COLORS.green[400], 0.6),
    badgeBg: withOpacity(COLORS.green[500], 0.3),
    badgeBorder: withOpacity(COLORS.green[400], 0.5),
    badgeText: COLORS.green[300],
    barTrackBg: withOpacity(COLORS.black, 0.35),
    barTrackBorder: withOpacity(COLORS.green[500], 0.5),
    barFillGradient: [COLORS.green[500], COLORS.emerald[500]],
    barOverlayGradient: [withOpacity(COLORS.white, 0.2), withOpacity(COLORS.white, 0.05)],
    buttonGradient: [COLORS.green[600], COLORS.emerald[600]],
    buttonPressedGradient: [COLORS.green[700], COLORS.emerald[700]],
    buttonText: COLORS.white,
    buttonShadow: withOpacity(COLORS.green[700], 0.5),
    textMain: COLORS.green[100],
    textSecondary: COLORS.green[200],
    textMuted: withOpacity(COLORS.green[200], 0.6),
    emoji: '🟢',
    label: 'YEŞİL',
  },

  // 🟡 YELLOW - Az hata var
  yellow: {
    bgGradient: [
      withOpacity(COLORS.yellow[900], 0.95),
      withOpacity(COLORS.yellow[800], 0.92),
      withOpacity(COLORS.yellow[900], 0.95),
    ],
    bgGradientDirection: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    glassOverlay: withOpacity(COLORS.white, 0.07),
    border: withOpacity(COLORS.yellow[500], 0.7),
    borderGlow: COLORS.yellow[500],
    shadowColor: COLORS.yellow[600],
    readyBorder: COLORS.yellow[400],
    readyShadow: withOpacity(COLORS.yellow[400], 0.6),
    badgeBg: withOpacity(COLORS.yellow[500], 0.3),
    badgeBorder: withOpacity(COLORS.yellow[400], 0.5),
    badgeText: COLORS.yellow[300],
    barTrackBg: withOpacity(COLORS.black, 0.35),
    barTrackBorder: withOpacity(COLORS.yellow[500], 0.5),
    barFillGradient: [COLORS.yellow[500], COLORS.yellow[600]],
    barOverlayGradient: [withOpacity(COLORS.white, 0.2), withOpacity(COLORS.white, 0.05)],
    buttonGradient: [COLORS.yellow[600], COLORS.yellow[700]],
    buttonPressedGradient: [COLORS.yellow[700], COLORS.yellow[800]],
    buttonText: COLORS.white,
    buttonShadow: withOpacity(COLORS.yellow[700], 0.5),
    textMain: COLORS.yellow[100],
    textSecondary: COLORS.yellow[200],
    textMuted: withOpacity(COLORS.yellow[200], 0.6),
    emoji: '🟡',
    label: 'SARI',
  },

  // 🟠 ORANGE - Orta hata
  orange: {
    bgGradient: [
      withOpacity(COLORS.orange[900], 0.95),
      withOpacity(COLORS.orange[800], 0.92),
      withOpacity(COLORS.orange[900], 0.95),
    ],
    bgGradientDirection: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    glassOverlay: withOpacity(COLORS.white, 0.06),
    border: withOpacity(COLORS.orange[500], 0.7),
    borderGlow: COLORS.orange[500],
    shadowColor: COLORS.orange[600],
    readyBorder: COLORS.orange[400],
    readyShadow: withOpacity(COLORS.orange[400], 0.6),
    badgeBg: withOpacity(COLORS.orange[500], 0.3),
    badgeBorder: withOpacity(COLORS.orange[400], 0.5),
    badgeText: COLORS.orange[200],
    barTrackBg: withOpacity(COLORS.black, 0.35),
    barTrackBorder: withOpacity(COLORS.orange[500], 0.5),
    barFillGradient: [COLORS.orange[500], COLORS.orange[600]],
    barOverlayGradient: [withOpacity(COLORS.white, 0.2), withOpacity(COLORS.white, 0.05)],
    buttonGradient: [COLORS.orange[600], COLORS.orange[700]],
    buttonPressedGradient: [COLORS.orange[700], COLORS.orange[800]],
    buttonText: COLORS.white,
    buttonShadow: withOpacity(COLORS.orange[700], 0.5),
    textMain: COLORS.orange[100],
    textSecondary: COLORS.orange[200],
    textMuted: withOpacity(COLORS.orange[200], 0.6),
    emoji: '🟠',
    label: 'TURUNCU',
  },

  // 🔴 RED - Çok hata
  red: {
    bgGradient: [
      withOpacity(COLORS.red[900], 0.95),
      withOpacity(COLORS.red[800], 0.92),
      withOpacity(COLORS.red[900], 0.95),
    ],
    bgGradientDirection: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    glassOverlay: withOpacity(COLORS.white, 0.05),
    border: withOpacity(COLORS.red[500], 0.7),
    borderGlow: COLORS.red[500],
    shadowColor: COLORS.red[600],
    readyBorder: COLORS.red[400],
    readyShadow: withOpacity(COLORS.red[400], 0.6),
    badgeBg: withOpacity(COLORS.red[500], 0.3),
    badgeBorder: withOpacity(COLORS.red[400], 0.5),
    badgeText: COLORS.red[200],
    barTrackBg: withOpacity(COLORS.black, 0.35),
    barTrackBorder: withOpacity(COLORS.red[500], 0.5),
    barFillGradient: [COLORS.red[500], COLORS.red[600]],
    barOverlayGradient: [withOpacity(COLORS.white, 0.2), withOpacity(COLORS.white, 0.05)],
    buttonGradient: [COLORS.red[600], COLORS.red[700]],
    buttonPressedGradient: [COLORS.red[700], COLORS.red[800]],
    buttonText: COLORS.white,
    buttonShadow: withOpacity(COLORS.red[700], 0.5),
    textMain: COLORS.red[100],
    textSecondary: COLORS.red[200],
    textMuted: withOpacity(COLORS.red[200], 0.6),
    emoji: '🔴',
    label: 'KIRMIZI',
  },

  // 🏆 MASTER - Gold/Altın (masterLevel === 1)
  master: {
    bgGradient: [
      withOpacity(COLORS.yellow[800], 0.96),
      withOpacity(COLORS.amber[600], 0.94),
      withOpacity(COLORS.yellow[800], 0.96),
    ],
    bgGradientDirection: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    glassOverlay: withOpacity('#ffd700', 0.12),
    border: withOpacity(COLORS.yellow[400], 0.85),
    borderGlow: '#ffd700',
    shadowColor: COLORS.yellow[500],
    readyBorder: COLORS.yellow[300],
    readyShadow: withOpacity(COLORS.yellow[400], 0.7),
    badgeBg: withOpacity(COLORS.yellow[400], 0.35),
    badgeBorder: withOpacity(COLORS.yellow[300], 0.6),
    badgeText: COLORS.yellow[100],
    barTrackBg: withOpacity(COLORS.black, 0.3),
    barTrackBorder: withOpacity(COLORS.yellow[400], 0.6),
    barFillGradient: [COLORS.yellow[400], COLORS.yellow[500]],
    barOverlayGradient: [withOpacity(COLORS.white, 0.25), withOpacity(COLORS.white, 0.08)],
    buttonGradient: [COLORS.pink[500], COLORS.pink[600]],
    buttonPressedGradient: [COLORS.pink[600], COLORS.pink[700]],
    buttonText: COLORS.white,
    buttonShadow: withOpacity(COLORS.pink[700], 0.5),
    textMain: COLORS.yellow[50],
    textSecondary: COLORS.yellow[100],
    textMuted: withOpacity(COLORS.yellow[200], 0.7),
    emoji: '🏆',
    label: 'MASTER CARD',
    shimmerColors: [
      'transparent',
      withOpacity(COLORS.white, 0.15),
      withOpacity(COLORS.white, 0.3),
      withOpacity(COLORS.white, 0.15),
      'transparent',
    ],
    glowIntensity: 0.6,
  },

  // 💎 ULTRA - Cyan/Diamond (masterLevel === 2)
  ultra: {
    bgGradient: [
      withOpacity(COLORS.cyan[700], 0.96),
      withOpacity(COLORS.cyan[500], 0.94),
      withOpacity(COLORS.blue[600], 0.96),
    ],
    bgGradientDirection: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    glassOverlay: withOpacity(COLORS.cyan[400], 0.15),
    border: withOpacity(COLORS.cyan[400], 0.9),
    borderGlow: COLORS.cyan[400],
    shadowColor: COLORS.cyan[500],
    readyBorder: COLORS.cyan[300],
    readyShadow: withOpacity(COLORS.cyan[400], 0.7),
    badgeBg: withOpacity(COLORS.cyan[400], 0.35),
    badgeBorder: withOpacity(COLORS.cyan[300], 0.6),
    badgeText: COLORS.cyan[100],
    barTrackBg: withOpacity(COLORS.black, 0.25),
    barTrackBorder: withOpacity(COLORS.cyan[400], 0.6),
    barFillGradient: [COLORS.cyan[400], COLORS.cyan[500], COLORS.cyan[600]],
    barOverlayGradient: [withOpacity(COLORS.white, 0.3), withOpacity(COLORS.white, 0.1)],
    buttonGradient: [COLORS.cyan[500], COLORS.cyan[600]],
    buttonPressedGradient: [COLORS.cyan[600], COLORS.cyan[700]],
    buttonText: COLORS.white,
    buttonShadow: withOpacity(COLORS.cyan[700], 0.5),
    textMain: COLORS.cyan[50],
    textSecondary: COLORS.cyan[100],
    textMuted: withOpacity(COLORS.cyan[200], 0.7),
    emoji: '💎',
    label: 'ULTRA CARD',
    shimmerColors: [
      'transparent',
      withOpacity(COLORS.cyan[200], 0.2),
      withOpacity(COLORS.white, 0.4),
      withOpacity(COLORS.cyan[200], 0.2),
      'transparent',
    ],
    glowIntensity: 0.75,
  },

  // 👑 PERFECT - Purple/Royal (masterLevel === 3)
  perfect: {
    bgGradient: [
      withOpacity(COLORS.purple[600], 0.96),
      withOpacity(COLORS.purple[400], 0.94),
      withOpacity(COLORS.purple[700], 0.96),
    ],
    bgGradientDirection: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    glassOverlay: withOpacity(COLORS.purple[400], 0.18),
    border: withOpacity(COLORS.purple[400], 0.95),
    borderGlow: COLORS.purple[400],
    shadowColor: COLORS.purple[500],
    readyBorder: COLORS.purple[300],
    readyShadow: withOpacity(COLORS.purple[400], 0.8),
    badgeBg: withOpacity(COLORS.purple[400], 0.4),
    badgeBorder: withOpacity(COLORS.purple[300], 0.7),
    badgeText: COLORS.purple[100],
    barTrackBg: withOpacity(COLORS.black, 0.2),
    barTrackBorder: withOpacity(COLORS.purple[400], 0.7),
    barFillGradient: [COLORS.purple[400], COLORS.purple[500], COLORS.purple[600]],
    barOverlayGradient: [withOpacity(COLORS.white, 0.35), withOpacity(COLORS.white, 0.12)],
    buttonGradient: [COLORS.purple[500], COLORS.purple[600]],
    buttonPressedGradient: [COLORS.purple[600], COLORS.purple[700]],
    buttonText: COLORS.white,
    buttonShadow: withOpacity(COLORS.purple[700], 0.5),
    textMain: COLORS.purple[50],
    textSecondary: COLORS.purple[100],
    textMuted: withOpacity(COLORS.purple[200], 0.7),
    emoji: '👑',
    label: 'PERFECT CARD',
    shimmerColors: [
      'transparent',
      withOpacity(COLORS.purple[200], 0.25),
      withOpacity(COLORS.white, 0.5),
      withOpacity(COLORS.purple[200], 0.25),
      'transparent',
    ],
    glowIntensity: 0.9,
  },
};

export type ColorSchemeKey = keyof typeof COLOR_SCHEMES;
