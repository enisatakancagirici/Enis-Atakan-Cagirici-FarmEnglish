import { Audio } from 'expo-av';

// 🎙️ TELAFFUZ SİSTEMİ - Google Translate TTS API ile
// Ücretsiz, telif sorunu yok, kadın sesi ile profesyonel telaffuz

interface PronunciationConfig {
  word: string;
  language?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  gender?: 'female' | 'male';
}

// 🔊 Ses objesi - tekrar kullanım için
let currentSound: Audio.Sound | null = null;
let isUnloading = false; // 🛡️ Race-condition guard

/**
 * 🛡️ Önceki sesi güvenli şekilde temizle
 */
const safeCleanupSound = async (): Promise<void> => {
  if (!currentSound || isUnloading) return;
  isUnloading = true;
  const soundToClean = currentSound;
  currentSound = null;
  try {
    await soundToClean.stopAsync();
  } catch {}
  try {
    await soundToClean.unloadAsync();
  } catch {}
  isUnloading = false;
};

/**
 * 🎙️ Bir kelimeyi sesle telaffuz et
 * Google Translate TTS API kullanıyor - ücretsiz ve telif sorunu yok
 * @param config Telaffuz ayarları
 */
export const pronounceWord = async (config: PronunciationConfig): Promise<void> => {
  try {
    const { word, language = 'en' } = config;
    
    if (!word || word.trim().length === 0) return;

    // Önceki sesi durdur ve temizle (await ile sıralı)
    await safeCleanupSound();

    // Google Translate TTS URL'si
    // tw-ob client = public web client, ücretsiz kullanım
    const encodedWord = encodeURIComponent(word.trim());
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${language}&client=tw-ob&q=${encodedWord}`;

    // Ses dosyasını yükle ve çal
    const { sound } = await Audio.Sound.createAsync(
      { uri: ttsUrl },
      { 
        shouldPlay: true,
        volume: 1.0,
      }
    );
    
    currentSound = sound;

    // Ses bitince otomatik temizle
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        if (currentSound === sound) {
          currentSound = null;
        }
      }
    });

  } catch (error) {
    // Sessiz başarısızlık - kullanıcıya hata göstermeyiz
  }
};

/**
 * 🎙️ Mevcut sesi durdur
 */
export const stopPronunciation = async (): Promise<void> => {
  try {
    await safeCleanupSound();
  } catch (error) {
  }
};

/**
 * 🎙️ Telaffuz sistemini başlat
 */
export const initializePronunciation = async (): Promise<void> => {
  try {
    // Audio mode ayarla
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  } catch (error) {
  }
};

// 🌍 Dile göre uygun kod
export const getLanguageCode = (language: string): string => {
  const languageMap: Record<string, string> = {
    en: 'en',
    tr: 'tr',
    es: 'es',
    fr: 'fr',
    de: 'de',
    it: 'it',
    pt: 'pt',
    ja: 'ja',
    ko: 'ko',
    zh: 'zh-CN',
  };
  return languageMap[language] || 'en';
};

export const pronunciation = {
  pronounceWord,
  stopPronunciation,
  initializePronunciation,
  getLanguageCode,
};
