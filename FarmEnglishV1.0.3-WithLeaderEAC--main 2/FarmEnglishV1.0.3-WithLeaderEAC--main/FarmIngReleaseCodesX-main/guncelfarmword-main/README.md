# FarmWord Mobile

Premium kelime öğrenme uygulaması - React Native versiyonu

## 🚀 Özellikler

- ✨ Premium UI/UX - Web versiyonuyla birebir aynı
- 🎨 React Native Reanimated ile silky smooth animasyonlar
- 🎮 Haptic feedback - Her dokunuşta fiziksel geri bildirim
- 🔥 Combo sistemi - Art arda doğru cevap verin
- 🏆 Master Card sistemi - 3+ hasat altın kart
- 💎 Ultra Master Card - 8+ hasat elmas kart
- 👑 Ultra Perfect Master - 13+ hasat kraliyet kartı
- 🌱 Farm sistemi - Kelimelerinizi yetiştirin
- 📦 Envanter sistemi - Ustalaştığınız kelimeler
- 🎯 Akıllı Quiz - Yeni kelimeler öğrenin
- 🎨 Color-coded öğrenme - Kırmızı/Turuncu/Sarı/Yeşil
- 📊 Detaylı istatistikler ve başarılar

## 📱 Kurulum

\`\`\`bash
# Bağımlılıkları yükle
npm install

# iOS için
npm run ios

# Android için
npm run android

# Expo Go ile test
npm start
\`\`\`

## 🎨 Kullanılan Teknolojiler

- React Native
- Expo
- React Native Reanimated 3
- React Native Gesture Handler
- Zustand (State Management)
- Expo Linear Gradient
- Expo AV (Sound)
- Expo Haptics
- React Navigation
- TypeScript

## 📂 Proje Yapısı

\`\`\`
src/
├── components/       # UI Komponentleri
│   ├── WordCard.tsx
│   ├── ParticleEffect.tsx
│   ├── ComboDisplay.tsx
│   └── ...
├── screens/         # Ekranlar
│   ├── HomeScreen.tsx
│   ├── QuizScreen.tsx
│   ├── FarmScreen.tsx
│   └── ...
├── store/          # State Management
│   └── farmStore.ts
├── models/         # TypeScript Types
│   └── types.ts
├── utils/          # Yardımcı Fonksiyonlar
│   ├── theme.ts
│   ├── sound.ts
│   └── difficultyTag.ts
└── config/         # Konfigürasyonlar
\`\`\`

## 🎯 Özellikler

### 🌱 Farm Sistemi
- Quiz'den eklenen kelimeler tarlaya düşer
- Doğru/Yanlış'a göre renk değişir
- Kırmızı → Turuncu → Sarı → Yeşil → Envanter

### 🏆 Master Card Sistemi
- **3+ Hasat**: 🏆 Altın Master Card
- **8+ Hasat**: 💎 Ultra Master (Mavi-Mor)
- **13+ Hasat**: 👑 Ultra Perfect Master (Pembe-Mor-İndigo)

### 🎮 Combo Sistemi
- 5 combo: ⚡ Turuncu
- 10 combo: 🔥 Kırmızı
- 15 combo: 💎 Mor-Pembe
- 20 combo: 👑 Altın

### 📊 İstatistikler
- Toplam doğru/yanlış
- En uzun combo
- Hasat edilen kelimeler
- Level ve XP sistemi

## 🎨 Tasarım

Tüm renkler ve animasyonlar web versiyonuyla %100 uyumlu:
- Gradient backgrounds
- Particle effects
- Smooth transitions
- Haptic feedback
- Color-coded progress

## 📝 Lisans

MIT

## Encoding Gate

Bozuk karakter tespitinde standart akis:

```bash
npm run encoding:fix
npm run encoding:audit
```

CI tarafinda `encoding:audit` zorunlu kosul olarak calisir.
