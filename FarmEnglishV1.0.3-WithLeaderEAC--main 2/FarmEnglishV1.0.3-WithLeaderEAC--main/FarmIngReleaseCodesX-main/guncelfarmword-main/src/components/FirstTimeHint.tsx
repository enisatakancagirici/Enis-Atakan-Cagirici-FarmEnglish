import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Sparkles } from 'lucide-react-native';
import { haptic } from '../utils/sound';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HintStep {
  id: string;
  title: string;
  message: string;
  emoji: string;
  position?: 'top' | 'center' | 'bottom';
}

interface FirstTimeHintProps {
  screenKey: string; // 'home' | 'farm' | 'inventory' | 'quiz'
  hints: HintStep[];
  onComplete?: () => void;
  onVisibilityChange?: (visible: boolean) => void;
}

const HINT_STORAGE_KEY = 'farmword:hints:';

export function FirstTimeHint({ screenKey, hints, onComplete, onVisibilityChange }: FirstTimeHintProps) {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    checkFirstTime();
  }, []);

  useEffect(() => {
    if (visible) {
      // Pulse animation for emoji
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [visible]);

  const checkFirstTime = async () => {
    try {
      const seen = await AsyncStorage.getItem(HINT_STORAGE_KEY + screenKey);
      if (!seen) {
        // İlk kez görüyor
        setTimeout(() => {
          setVisible(true);
          onVisibilityChange?.(true);
          Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
          ]).start();
        }, 800); // Ekran yüklendikten sonra göster
      }
    } catch (e) {}
  };

  const markAsSeen = async () => {
    try {
      await AsyncStorage.setItem(HINT_STORAGE_KEY + screenKey, 'true');
    } catch (e) {}
  };

  const handleNext = () => {
    haptic.light();
    
    if (currentStep < hints.length - 1) {
      // Sonraki adım
      Animated.sequence([
        Animated.timing(slideAnim, { toValue: -30, duration: 150, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 30, duration: 0, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
      ]).start();
      setCurrentStep(prev => prev + 1);
    } else {
      // Bitir
      handleClose();
    }
  };

  const handleClose = () => {
    haptic.light();
    markAsSeen();
    
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 50, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      onVisibilityChange?.(false);
      onComplete?.();
    });
  };

  if (!visible || hints.length === 0) return null;

  const currentHint = hints[currentStep];
  const isLast = currentStep === hints.length - 1;
  const position = currentHint.position || 'center';

  return (
    <Animated.View 
      style={[
        styles.overlay,
        { opacity: fadeAnim }
      ]}
    >
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={1} 
        onPress={handleNext}
      />
      
      <Animated.View 
        style={[
          styles.hintContainer,
          position === 'top' && styles.positionTop,
          position === 'bottom' && styles.positionBottom,
          { transform: [{ translateY: slideAnim }] }
        ]}
      >
        <LinearGradient
          colors={['rgba(30, 41, 59, 0.98)', 'rgba(15, 23, 42, 0.98)']}
          style={styles.hintCard}
        >
          {/* Close Button */}
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <X size={20} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>

          {/* Emoji with pulse */}
          <Animated.Text 
            style={[
              styles.emoji,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            {currentHint.emoji}
          </Animated.Text>

          {/* Title */}
          <Text style={styles.title}>{currentHint.title}</Text>

          {/* Message */}
          <Text style={styles.message}>{currentHint.message}</Text>

          {/* Progress dots */}
          {hints.length > 1 && (
            <View style={styles.dotsContainer}>
              {hints.map((_, index) => (
                <View 
                  key={index}
                  style={[
                    styles.dot,
                    index === currentStep && styles.dotActive
                  ]}
                />
              ))}
            </View>
          )}

          {/* Action button */}
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isLast ? ['#22c55e', '#16a34a'] : ['#6366f1', '#4f46e5']}
              style={styles.actionBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.actionBtnText}>
                {isLast ? 'Anladım! 🚀' : 'Sonraki →'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}

// 🎯 Hazır hint setleri - Detaylı ve kapsamlı açıklamalar
export const HINTS = {
  home: [
    {
      id: 'welcome',
      emoji: '🌱',
      title: 'FarmEnglish\'e Hoş Geldin!',
      message: 'Kelime öğrenmek artık tarla gibi! Quiz çöz → Kelime tarlana eklensin → Büyüt → Hasat et! Her kelime bir tohum, 3 doğru cevapla hasat hazır! 🌾',
      position: 'center' as const,
    },
    {
      id: 'start',
      emoji: '🎯',
      title: 'Nereden Başlamalı?',
      message: 'QUIZ butonuna bas ve soruları cevapla. Bilsen de bilmesen de kelime tarlana eklenir!\n\n✅ Doğru = Kelime büyür\n❌ Yanlış = Kelime kırmızı kalır (çalışmalısın!)',
      position: 'center' as const,
    },
    {
      id: 'navigation',
      emoji: '🗺️',
      title: 'Menü Rehberi',
      message: '🎯 QUIZ: Kelime öğren, coin kazan\n🌱 ÇİFTLİK: Kelimelerini gör, quiz çöz\n📦 ENVANTER: Hasat edilmiş kelimeler\n🧩 YAPBOZ: Cümle içinde öğren\n🏪 MARKET: Tohum & boost al',
      position: 'bottom' as const,
    },
  ],
  farm: [
    {
      id: 'colors',
      emoji: '🎨',
      title: 'Kart Renkleri Ne Anlama Geliyor?',
      message: '🔴 KIRMIZI: 0 doğru (acil çalış!)\n🟠 TURUNCU: 1 doğru\n🟡 SARI: 2 doğru\n🟢 YEŞİL: 3+ doğru = HASAT HAZIR!\n\nKarta dokun → Quiz aç → Doğru cevapla!',
      position: 'center' as const,
    },
    {
      id: 'harvest',
      emoji: '🌾',
      title: 'Hasat Nasıl Yapılır?',
      message: 'Kelimeye 3 kez doğru cevap ver → Kart YEŞİL olur → Karta dokun → "HASAT" butonuna bas!\n\n🎉 Hasat edilen kelime ENVANTER\'e gider ve "öğrenildi" sayılır!',
      position: 'center' as const,
    },
    {
      id: 'tabs',
      emoji: '📑',
      title: 'Üç Farklı Sekme',
      message: '📚 KELİMELER: Normal İngilizce kelimeler\n🌳 PHRASAL: Deyimsel fiiller (give up, look after...)\n🧩 YAPBOZ: Cümle düzenleme oyunu\n\nHepsini çalış, tam öğren!',
      position: 'center' as const,
    },
    {
      id: 'filters',
      emoji: '🔍',
      title: 'Filtreler',
      message: '📋 Tümü: Her şeyi gör\n🌾 Hasat: Sadece yeşil kartlar\n📕 Çalışmalıyım: Kırmızı-turuncu (zayıf olanlar)\n⭐ Favoriler: Yıldızladıkların',
      position: 'top' as const,
    },
  ],
  inventory: [
    {
      id: 'intro',
      emoji: '📦',
      title: 'Envanter = Öğrenilmiş Kelimeler',
      message: 'Hasat ettiğin her kelime buraya gelir. Bu senin kelime hazinen! 🏆\n\nBuradaki kelimeler artık quiz\'de karşına çıkmaz.',
      position: 'center' as const,
    },
    {
      id: 'levels',
      emoji: '⭐',
      title: 'Master Seviyeleri',
      message: 'Aynı kelimeyi tekrar hasat ederek seviye atlat:\n\n⭐ USTA: 1x hasat\n💎 ELMAS: 2x hasat\n👑 KRALİYET: 3+ hasat\n\n"Tarlaya Gönder" ile tekrar çalış!',
      position: 'center' as const,
    },
    {
      id: 'replant',
      emoji: '🔄',
      title: 'Tarlaya Geri Gönder',
      message: 'Kelimeyi unutmak üzeresin mi? "Tarlaya Gönder" butonuna bas!\n\n✅ Kelime tarlana döner\n✅ Hasat seviyesi korunur\n✅ Yeniden quiz çözebilirsin',
      position: 'center' as const,
    },
  ],
  quiz: [
    {
      id: 'gameplay',
      emoji: '🎮',
      title: 'Quiz Nasıl Oynanır?',
      message: 'Üstte İngilizce kelime → Altta 4 Türkçe seçenek\n\nDoğru anlamı bul ve dokun!\n\n⏱️ Hızlı cevap = Bonus XP\n🔥 Üst üste doğru = Combo bonusu',
      position: 'center' as const,
    },
    {
      id: 'result',
      emoji: '📊',
      title: 'Sonuç Ne Olur?',
      message: '✅ DOĞRU: Kelime tarlana eklenir, seviye +1\n❌ YANLIŞ: Kelime yine tarlana eklenir ama seviye 0\n\n💡 Yanlış bilsen de kelime tarlana gider, orada çalışırsın!',
      position: 'center' as const,
    },
    {
      id: 'combo',
      emoji: '🔥',
      title: 'Combo Sistemi',
      message: 'Üst üste doğru cevaplar COMBO yapar:\n\n🔥 3+ = Ekstra coin\n💥 5+ = Daha fazla coin\n⚡ 10+ = Çok daha fazla!\n\n❌ Bir yanlış = Combo sıfırlanır!',
      position: 'center' as const,
    },
  ],
  phrasalVerb: [
    {
      id: 'intro',
      emoji: '🌳',
      title: 'Phrasal Verb Nedir?',
      message: 'Fiil + Edat kombinasyonları:\n\n"give up" = vazgeçmek\n"look after" = bakmak\n"break down" = bozulmak\n\nİngilizce konuşmada ÇOK kullanılır!',
      position: 'center' as const,
    },
    {
      id: 'learning',
      emoji: '📖',
      title: 'Nasıl Öğrenilir?',
      message: 'Normal kelimeler gibi:\n\n1️⃣ Quiz çöz → Tarlana ekle\n2️⃣ Karta dokun → Tekrar quiz\n3️⃣ 3 doğru → Yeşil kart\n4️⃣ Hasat et → Envantere ekle',
      position: 'center' as const,
    },
  ],
  store: [
    {
      id: 'seeds',
      emoji: '🌱',
      title: 'Tohum Satın Al',
      message: 'Marketten yeni kelime tohumları al!\n\n💰 Coin harca → Yeni kelimeler → Tarlana ekle\n\n📊 Zorluk seviyesine göre fiyat değişir.',
      position: 'center' as const,
    },
    {
      id: 'boosts',
      emoji: '⚡',
      title: 'Boost\'lar',
      message: '🛡️ Combo Shield: Yanlışta combo kırılmaz\n⏱️ Zaman Uzatıcı: Quiz süresi uzar\n✂️ Seçenek Azalt: 4 yerine 2 şık\n💎 2x XP: Çift XP kazan',
      position: 'center' as const,
    },
  ],
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  hintContainer: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 340,
  },
  positionTop: {
    position: 'absolute',
    top: 120,
  },
  positionBottom: {
    position: 'absolute',
    bottom: 140,
  },
  hintCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dotActive: {
    backgroundColor: '#6366f1',
    width: 24,
  },
  actionBtn: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
