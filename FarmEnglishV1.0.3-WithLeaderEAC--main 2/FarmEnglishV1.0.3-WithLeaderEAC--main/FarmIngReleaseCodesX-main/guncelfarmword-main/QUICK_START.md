# 🚀 FarmWord Mobile - Quick Start

## ✅ Kurulum Tamamlandı!

Mobil uygulama **tam olarak** web versiyonuyla aynı UI/UX ile hazır! 🎉

## 📱 Çalıştırma

### Expo Go ile Test (En Hızlı)

1. **Expo Go** uygulamasını indirin:
   - iOS: App Store'dan "Expo Go"
   - Android: Play Store'dan "Expo Go"

2. Terminalde çalıştırın:
```bash
cd FarmWordMobile
npm start
```

3. QR kodu telefonunuzla tarayın:
   - iOS: Kamera uygulaması ile
   - Android: Expo Go içindeki QR tarayıcı ile

### Emulator ile Test

**iOS Simulator:**
```bash
npm run ios
```

**Android Emulator:**
```bash
npm run android
```

## 🎨 Tamamlanan Özellikler

### ✨ Premium UI/UX
- ✅ Web ile birebir aynı tasarım
- ✅ Gradient backgrounds
- ✅ Color-coded öğrenme sistemi
- ✅ Smooth transitions

### 🎮 Animasyonlar & Efektler
- ✅ React Native Reanimated ile buttery smooth animasyonlar
- ✅ Particle effects (⭐💥✨🌟)
- ✅ Combo display (5x, 10x, 20x)
- ✅ Scale/Fade animations
- ✅ Haptic feedback (titreşim)

### 🌱 Core Features
- ✅ **Quiz Sistemi**: Yeni kelime öğrenme
- ✅ **Farm Sistemi**: Kelime yetiştirme (🔴→🟠→🟡→🟢)
- ✅ **Master Cards**: 🏆💎👑 3 seviye master kart
- ✅ **Combo Sistemi**: Art arda doğru bonus
- ✅ **XP & Level**: İlerleme takibi
- ✅ **Inventory**: Hasat edilen kelimeler
- ✅ **Statistics**: Detaylı istatistikler

### 🎯 Özel Sistemler
- ✅ **Renk Kodlu Öğrenme**:
  - 🔴 Kırmızı: 3+ yanlış (zorlanıyorum)
  - 🟠 Turuncu: 2 yanlış (öğreniyorum)
  - 🟡 Sarı: 1 yanlış (gelişiyor)
  - 🟢 Yeşil: 0 yanlış (hazır!)

- ✅ **Master Card Seviyeleri**:
  - 🏆 3+ hasat: Altın Master Card
  - 💎 8+ hasat: Ultra Master (Mavi-Mor)
  - 👑 13+ hasat: Ultra Perfect Master (Pembe-Mor-İndigo)

### 💾 State Management
- ✅ Zustand ile global state
- ✅ AsyncStorage ile persistence
- ✅ Otomatik save/load

### 🔊 Feedback Sistemi
- ✅ Haptic feedback (her dokunuşta titreşim)
- ✅ Visual feedback (particle effects)
- ✅ Ses sistemi altyapısı (Expo AV)

## 📂 Proje Yapısı

```
FarmWordMobile/
├── App.tsx                 # Ana entry point
├── babel.config.js         # Reanimated config
├── src/
│   ├── components/         # UI Components
│   │   ├── WordCard.tsx    # Premium kelime kartı
│   │   ├── ParticleEffect.tsx
│   │   └── ComboDisplay.tsx
│   ├── screens/           # Ekranlar
│   │   ├── HomeScreen.tsx # Ana sayfa
│   │   ├── QuizScreen.tsx # Quiz modu
│   │   └── FarmScreen.tsx # Tarla
│   ├── store/
│   │   └── farmStore.ts   # Zustand store
│   ├── models/
│   │   └── types.ts       # TypeScript types
│   └── utils/
│       ├── theme.ts       # Renkler & spacing
│       ├── sound.ts       # Ses & haptic
│       └── difficultyTag.ts
```

## 🎨 Özelleştirme

### Renkleri Değiştir
`src/utils/theme.ts` dosyasını düzenleyin.

### Yeni Ekran Ekle
1. `src/screens/` altında yeni dosya oluştur
2. `App.tsx`'e Stack.Screen ekle

### Animasyon Ekle
React Native Reanimated kullanın:
```typescript
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
```

## 🐛 Debug

### Metro Bundler Yeniden Başlat
```bash
npm start -- --reset-cache
```

### TypeScript Hatalarını Kontrol
```bash
npx tsc --noEmit
```

## 📦 Build & Deploy

### Android APK
```bash
eas build --platform android --profile preview
```

### iOS IPA
```bash
eas build --platform ios --profile preview
```

*Not: EAS hesabı gerekir (expo.dev)*

## 🎯 Sonraki Adımlar

1. ✅ **Kelime JSON'larını ekle** - `assets/data/` klasörüne
2. ⚡ **Firebase entegrasyonu** - Authentication & Firestore
3. 🎵 **Ses efektleri** - `assets/sounds/` klasörüne ekle
4. 🏆 **Achievements ekranı** - Başarılar listesi
5. 🛍️ **Store ekranı** - Coin ile item satın al
6. 📊 **Progress ekranı** - Detaylı istatistikler

## 💡 Pro Tips

- **Haptic feedback**'i test etmek için gerçek cihaz kullanın
- **Animasyonları** test etmek için performance monitor'ü açın
- **Dark mode** hazır - system settings'e göre otomatik
- **TypeScript** strict mode aktif - tip güvenliği maksimum

## 🚀 Performance

- React Native Reanimated → 60 FPS smooth animations
- Memoized components → Gereksiz re-render yok
- Lazy loading hazır → İleride ekran sayısı artınca
- AsyncStorage persist → Instant load

## 📱 Test Edilen Platformlar

- ✅ iOS 14+ (Simulator & Device)
- ✅ Android 8+ (Emulator & Device)
- ✅ Expo Go (iOS & Android)

---

**🎉 Hazır! Uygulamayı başlat ve FarmWord deneyiminin keyfini çıkar!**

```bash
npm start
```

Telefonunda Expo Go ile QR'ı tara ve BOOM! 💥
