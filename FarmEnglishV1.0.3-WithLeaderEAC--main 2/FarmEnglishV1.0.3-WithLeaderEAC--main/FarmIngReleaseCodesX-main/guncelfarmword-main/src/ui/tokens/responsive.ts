/**
 * 🎨 Responsive Utilities
 * 
 * rs(size) - Responsive size: Ekran genişliğine göre ölçekleme (spacing, padding, margin)
 * rt(size) - Responsive text: Ekran genişliğine göre font ölçekleme
 * 
 * Base: iPhone 14 Pro (393px genişlik)
 * Her cihazda aynı oran, hiç overlap olmayacak.
 */

import { Dimensions, PixelRatio, Platform, StatusBar } from 'react-native';

// 📱 Ekran boyutları - export ediyoruz
export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 📱 Base device: iPhone 14 Pro
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

// 📱 Screen type detection
export const IS_TINY_SCREEN = SCREEN_HEIGHT < 680; // iPhone SE, 4.7"
export const IS_SMALL_SCREEN = SCREEN_HEIGHT >= 680 && SCREEN_HEIGHT < 750; // iPhone 11/12/13/14
export const IS_MEDIUM_SCREEN = SCREEN_HEIGHT >= 750 && SCREEN_HEIGHT < 850; // iPhone Pro
export const IS_LARGE_SCREEN = SCREEN_HEIGHT >= 850; // iPhone Pro Max, Plus
export const IS_TABLET = SCREEN_WIDTH >= 600;

// 🔢 Notch height
export const NOTCH_HEIGHT = Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 24);

// 📐 Scale factors
const widthScale = SCREEN_WIDTH / BASE_WIDTH;
const heightScale = SCREEN_HEIGHT / BASE_HEIGHT;

// Daha dengeli bir scale - genişlik ve yüksekliğin ortalaması
const moderateScale = (widthScale + heightScale) / 2;

/**
 * rs() - Responsive Size
 * Spacing, padding, margin, border radius için kullanılır.
 * Ekran boyutuna göre orantılı ölçekleme yapar.
 * 
 * @param size - Base boyut (iPhone 14 Pro referans)
 * @param factor - Ölçekleme faktörü (0-1 arası, default 0.5)
 * @returns Ölçeklenmiş boyut
 * 
 * @example
 * rs(16) // 16px base, orantılı ölçeklenir
 * rs(16, 0.3) // Daha az ölçekleme (daha stabil)
 * rs(16, 0.8) // Daha fazla ölçekleme (daha agresif)
 */
export function rs(size: number, factor: number = 0.5): number {
  const scaledSize = size + (moderateScale - 1) * size * factor;
  // Minimum ve maximum sınırları (overlap önleme)
  const minSize = size * 0.7;
  const maxSize = size * 1.4;
  return Math.round(Math.min(Math.max(scaledSize, minSize), maxSize));
}

/**
 * rt() - Responsive Text
 * Font size için kullanılır.
 * PixelRatio ile normalize edilir (okunabilirlik için).
 * 
 * @param size - Base font boyutu (iPhone 14 Pro referans)
 * @param factor - Ölçekleme faktörü (0-1 arası, default 0.4)
 * @returns Ölçeklenmiş font boyutu
 * 
 * @example
 * rt(14) // 14px base, orantılı ölçeklenir
 * rt(14, 0.2) // Daha az ölçekleme (başlıklar için)
 * rt(14, 0.6) // Daha fazla ölçekleme (body text için)
 */
export function rt(size: number, factor: number = 0.4): number {
  const scaledSize = size + (widthScale - 1) * size * factor;
  // Font için PixelRatio normalize
  const normalizedSize = Math.round(PixelRatio.roundToNearestPixel(scaledSize));
  // Minimum ve maximum sınırları (okunabilirlik)
  const minSize = size * 0.75;
  const maxSize = size * 1.3;
  return Math.min(Math.max(normalizedSize, minSize), maxSize);
}

/**
 * rh() - Responsive Height (percentage based)
 * Ekran yüksekliğinin yüzdesi olarak hesaplar.
 * 
 * @param percentage - Ekran yüksekliğinin yüzdesi (0-100)
 * @returns Piksel değeri
 */
export function rh(percentage: number): number {
  return Math.round((SCREEN_HEIGHT * percentage) / 100);
}

/**
 * rw() - Responsive Width (percentage based)
 * Ekran genişliğinin yüzdesi olarak hesaplar.
 * 
 * @param percentage - Ekran genişliğinin yüzdesi (0-100)
 * @returns Piksel değeri
 */
export function rw(percentage: number): number {
  return Math.round((SCREEN_WIDTH * percentage) / 100);
}

/**
 * 📏 Standart Spacing Scale
 * Tutarlı spacing için kullanılacak değerler
 */
export const SPACING = {
  xxs: rs(2),
  xs: rs(4),
  sm: rs(8),
  md: rs(12),
  lg: rs(16),
  xl: rs(20),
  xxl: rs(24),
  xxxl: rs(32),
} as const;

/**
 * 📝 Standart Typography Scale
 * Tutarlı font boyutları için kullanılacak değerler
 */
export const TYPOGRAPHY = {
  // Labels & Captions
  caption: rt(10),
  label: rt(11),
  
  // Body text
  bodySmall: rt(12),
  body: rt(14),
  bodyLarge: rt(16),
  
  // Headings
  h5: rt(18),
  h4: rt(20),
  h3: rt(24),
  h2: rt(28),
  h1: rt(32),
  
  // Display (hero text)
  display: rt(40),
} as const;

/**
 * 🔲 Standart Border Radius Scale
 */
export const RADIUS = {
  xs: rs(4),
  sm: rs(8),
  md: rs(12),
  lg: rs(16),
  xl: rs(20),
  xxl: rs(24),
  full: 9999,
} as const;

/**
 * 📦 Card-specific dimensions
 */
export const CARD = {
  // Grid card (2 columns)
  gridWidth: (SCREEN_WIDTH - rs(32) - rs(8)) / 2, // padding + gap
  gridMinHeight: rs(180),
  gridPadding: rs(12),
  gridBorderRadius: rs(16),
  gridBorderWidth: rs(1.5),
  
  // Feed card (full width)
  feedMaxWidth: rs(340),
  feedPadding: rs(24),
  feedBorderRadius: rs(28),
  feedBorderWidth: rs(2),
  
  // Inventory card
  inventoryMarginH: rs(16),
  inventoryMarginV: rs(10),
  inventoryBorderRadius: rs(24),
} as const;

export default {
  rs,
  rt,
  rh,
  rw,
  SPACING,
  TYPOGRAPHY,
  RADIUS,
  CARD,
  IS_TINY_SCREEN,
  IS_SMALL_SCREEN,
  IS_MEDIUM_SCREEN,
  IS_LARGE_SCREEN,
  IS_TABLET,
  NOTCH_HEIGHT,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
};
