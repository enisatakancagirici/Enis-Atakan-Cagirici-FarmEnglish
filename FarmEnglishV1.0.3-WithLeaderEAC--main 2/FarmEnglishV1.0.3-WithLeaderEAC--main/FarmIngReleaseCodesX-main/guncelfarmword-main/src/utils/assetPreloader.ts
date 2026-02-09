/**
 * 🖼️ ASSET PRELOADER - Tüm görselleri önceden yükle
 * 
 * Bu modül tüm uygulama görsellerini App.tsx'de başlangıçta yükler.
 * Bu sayede görsel gecikmesi (lazy loading) sorunu çözülür.
 */

// 🏠 Homepage görselleri
export const HOMEPAGE_IMAGES = {
  envanter: require('../../assets/images/maskot/envanter.webp'),
  farm: require('../../assets/images/maskot/farm.webp'),
  marketKapak: require('../../assets/images/maskot/market_anasayfa.webp'),
  phrasal: require('../../assets/images/maskot/phrasal.webp'),
  puzzle: require('../../assets/images/maskot/puzzle.webp'),
  quiz: require('../../assets/images/maskot/quiz.webp'),
  quizLogo: require('../../assets/images/maskot/quiz_logo.webp'),
  soruIsareti: require('../../assets/images/maskot/soru_isareti.webp'),
};

// 🛒 Market görselleri
export const MARKET_IMAGES = {
  marketGuc: require('../../assets/images/maskot/guc_magazasi.webp'),
  marketPhrasal: require('../../assets/images/maskot/market_pharasal.webp'),
  marketTohum: require('../../assets/images/maskot/tohum_pazarı.webp'),
};

// 🚜 Çiftlik filtre görselleri
export const CIFTLIK_FILTRE_IMAGES = {
  kelimeler: require('../../assets/images/maskot/sekme_kelimeler_ciftlik.webp'),
  phrasal: require('../../assets/images/maskot/sekme_phrasal_ciftlik.webp'),
  yapboz: require('../../assets/images/maskot/sekme_yapboz_ciftlik.webp'),
};

// 🌾 Çiftlik tab görselleri (eski)
export const CIFTLIK_TAB_IMAGES = {
  kelimeler: require('../../assets/images/maskot/kelimeler_tab_ciftlik.png'),
  phrasal: require('../../assets/images/maskot/pharasal_tab_ciftlik.png'),
  yapboz: require('../../assets/images/maskot/yapboz_tab_ciftlik.png'),
};

// 🌾 Çiftlik tab görselleri (yeni - webp)
export const CIFTLIK_TAB_YENI_IMAGES = {
  kelimeler: require('../../assets/images/maskot/kelimeler_ciftlik_tab_yeni.webp'),
  phrasal: require('../../assets/images/maskot/pharasal_ciftlik_tab_yeni.webp'),
  yapboz: require('../../assets/images/maskot/yapboz_ciftlik_tab_yeni.webp'),
};

// 📦 Envanter tab görselleri (yeni - webp)
export const ENVANTER_TAB_YENI_IMAGES = {
  kelimeler: require('../../assets/images/maskot/kelimeler_envanter_tab_yeni.webp'),
  phrasal: require('../../assets/images/maskot/pharasal_envanter_tab_yeni.webp'),
  yapboz: require('../../assets/images/maskot/yapboz_envanter_tab_yeni.webp'),
};

// 📦 Envanter filtre görselleri
export const ENVANTER_FILTRE_IMAGES = {
  kelimeler: require('../../assets/images/maskot/sekme_kelimeler_envanter.webp'),
  phrasal: require('../../assets/images/maskot/sekme_phrasal_envanter.webp'),
  yapboz: require('../../assets/images/maskot/sekme_yapboz_envanter.webp'),
};

// 🛷 Navbar görselleri
export const NAVBAR_IMAGES = {
  ciftlik: require('../../assets/images/maskot/ciftlik_navbar.png'),
  envanter: require('../../assets/images/maskot/envanter_navbar.png'),
};

// 🍎 Meyve görselleri
export const FRUIT_IMAGES = {
  bugday: require('../../assets/images/maskot/bugday.webp'),
  cilek1: require('../../assets/images/maskot/cilek1.webp'),
  cilek2: require('../../assets/images/maskot/cilek2.webp'),
  cilek3: require('../../assets/images/maskot/cilek3.webp'),
  cilek4: require('../../assets/images/maskot/cilek4.webp'),
  elma1: require('../../assets/images/maskot/elma1.webp'),
  elma2: require('../../assets/images/maskot/elma2.webp'),
  elma3: require('../../assets/images/maskot/elma3.webp'),
  elma4: require('../../assets/images/maskot/elma4.webp'),
  karpuz1: require('../../assets/images/maskot/karpuz1.webp'),
  karpuz2: require('../../assets/images/maskot/karpuz2.webp'),
  karpuz3: require('../../assets/images/maskot/karpuz3.webp'),
  karpuz4: require('../../assets/images/maskot/karpuz4.webp'),
  kiraz1: require('../../assets/images/maskot/kiraz1.webp'),
  kiraz2: require('../../assets/images/maskot/kiraz2.webp'),
  kiraz3: require('../../assets/images/maskot/kiraz3.webp'),
  kiraz4: require('../../assets/images/maskot/kiraz4.webp'),
  muz1: require('../../assets/images/maskot/muz1.webp'),
  muz2: require('../../assets/images/maskot/muz2.webp'),
  muz3: require('../../assets/images/maskot/muz3.webp'),
  muz4: require('../../assets/images/maskot/muz4.webp'),
  uzum1: require('../../assets/images/maskot/uzum1.webp'),
  uzum2: require('../../assets/images/maskot/uzum2.webp'),
  uzum3: require('../../assets/images/maskot/uzum3.webp'),
  uzum4: require('../../assets/images/maskot/uzum4.webp'),
};

// 🌱 Maskot görseli
export const MASCOT_IMAGE = require('../../assets/images/maskot/maskot.webp');

/**
 * Tüm görsellerin listesini döndürür - Asset.loadAsync için
 * @returns Array of require() image sources
 */
export function getAllAppImages(): any[] {
  const images: any[] = [];
  
  // Homepage
  Object.values(HOMEPAGE_IMAGES).forEach(img => images.push(img));
  
  // Market
  Object.values(MARKET_IMAGES).forEach(img => images.push(img));
  
  // Çiftlik filtre
  Object.values(CIFTLIK_FILTRE_IMAGES).forEach(img => images.push(img));
  
  // Çiftlik tab (eski)
  Object.values(CIFTLIK_TAB_IMAGES).forEach(img => images.push(img));
  
  // Çiftlik tab (yeni webp)
  Object.values(CIFTLIK_TAB_YENI_IMAGES).forEach(img => images.push(img));
  
  // Envanter tab (yeni webp)
  Object.values(ENVANTER_TAB_YENI_IMAGES).forEach(img => images.push(img));
  
  // Envanter filtre
  Object.values(ENVANTER_FILTRE_IMAGES).forEach(img => images.push(img));
  
  // Navbar
  Object.values(NAVBAR_IMAGES).forEach(img => images.push(img));
  
  // Meyveler
  Object.values(FRUIT_IMAGES).forEach(img => images.push(img));
  
  // Maskot
  images.push(MASCOT_IMAGE);
  
  return images;
}

/**
 * Preload helper - Kategoriye göre sadece belirli görselleri yükle
 */
export const AppImageSources = {
  homepage: HOMEPAGE_IMAGES,
  market: MARKET_IMAGES,
  ciftlikFiltre: CIFTLIK_FILTRE_IMAGES,
  envanterFiltre: ENVANTER_FILTRE_IMAGES,
  fruits: FRUIT_IMAGES,
  mascot: MASCOT_IMAGE,
};
