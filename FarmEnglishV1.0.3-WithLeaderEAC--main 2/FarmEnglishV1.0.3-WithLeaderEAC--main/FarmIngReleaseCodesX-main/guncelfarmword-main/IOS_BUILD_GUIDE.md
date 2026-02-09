# 🍎 iOS Build Rehberi - FarmEnglish

## 📋 Önkoşullar

✅ Apple Developer Account ($99/yıl)  
✅ EAS CLI yüklü (`npm install -g eas-cli`)  
✅ Expo hesabı ve giriş yapılmış (`eas login`)  
✅ Bundle ID: `com.machinexus.farming`

---

## 🔧 Sorun: CocoaPods / Firebase Build Hatası

**Hata:**
```
Unknown error. See logs of the Install pods build phase
```

**Neden:**
- `@react-native-firebase/*` paketleri iOS'ta ek yapılandırma gerektiriyor
- `@shopify/react-native-skia` CocoaPods ile çakışıyor
- Firebase kullanmıyorsak gereksiz yük

---

## ✅ ÇÖZÜM 1: Firebase'i Kaldır (Önerilen)

Firebase kullanmıyorsanız (auth/firestore yok gibi görünüyor):

### 1. Firebase Paketlerini Kaldır

```bash
npm uninstall @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore
```

### 2. Prebuild Tekrarla

```bash
npx expo prebuild --clean
```

### 3. iOS Build

```bash
eas build --platform ios --profile production
```

---

## ✅ ÇÖZÜM 2: Firebase Kullanıyorsanız

Eğer Firebase şart ise `eas.json`'a iOS yapılandırması ekle:

### 1. `eas.json` Güncelle

```json
{
  "cli": {
    "version": ">= 12.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "ios": {
        "buildConfiguration": "Release",
        "cocoapods": {
          "deploymentTarget": "15.0"
        }
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### 2. `app.json`'a Firebase Config Ekle

```json
{
  "expo": {
    // ... mevcut config
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.machinexus.farming",
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      },
      "googleServicesFile": "./GoogleService-Info.plist" // Firebase için
    }
  }
}
```

### 3. GoogleService-Info.plist Ekle

Firebase Console'dan `GoogleService-Info.plist` indir ve proje root'una koy.

---

## ✅ ÇÖZÜM 3: Skia Problemliyse

`@shopify/react-native-skia` sorun çıkarıyorsa:

```bash
npm uninstall @shopify/react-native-skia
```

Sonra prebuild ve build tekrarla.

---

## 🚀 Build Sonrası Adımlar

### 1. Build Başarılı Olunca

EAS size bir **IPA dosyası** linki verecek:
```
✅ Build finished!
Download: https://expo.dev/accounts/.../builds/.../artifacts/.../...ipa
```

### 2. App Store Connect

1. **App Store Connect'e git**: https://appstoreconnect.apple.com
2. **"My Apps" → "+" → "New App"**
3. **Bilgileri doldur:**
   - Platform: iOS
   - Name: FarmEnglish
   - Primary Language: Turkish
   - Bundle ID: com.machinexus.farming
   - SKU: farmenglish-001

### 3. TestFlight (İsteğe Bağlı)

EAS build bitince:
```bash
eas submit --platform ios --profile production
```

Otomatik olarak TestFlight'a yükler, beta test yapabilirsin.

### 4. App Store Metadata

App Store Connect'te doldurulması gerekenler:

#### Zorunlu:
- **App Name**: FarmEnglish
- **Subtitle**: İngilizce kelime öğrenme tarım oyunu
- **Description**: (En az 100 karakter)
- **Keywords**: farmenglish, english, vocabulary, education, game
- **Category**: Education / Games
- **Screenshots**: (6.7", 6.5", 5.5" iPhone için)
- **Privacy Policy URL**: (GitHub'dan host et)

#### İsteğe Bağlı:
- App Preview Video
- Promotional Text
- What's New

---

## 📸 Ekran Görüntüleri Gereksinimleri

### iPhone 6.7" (iPhone 15 Pro Max)
- 1290 x 2796 px
- En az 3 adet, maks 10

### iPhone 6.5" (iPhone 11 Pro Max)
- 1242 x 2688 px
- En az 3 adet

**Screenshot nasıl alınır:**
```bash
npx expo run:ios
# Simulator'dan Cmd+S ile screenshot al
```

---

## ✅ Son Kontroller

- [ ] `app.json` → version güncel (1.0.0)
- [ ] Bundle ID: `com.machinexus.farming`
- [ ] Firebase kullanmıyorsan kaldırdın
- [ ] Skia gerekliyse yarn/npm versiyonunu kontrol et
- [ ] Privacy Policy hazır
- [ ] Screenshots hazır
- [ ] App Store Connect'te metadata doldurulmuş

---

## 🔄 Build Tekrar Başarısız Olursa

1. **EAS build loglarını aç:**
   ```
   https://expo.dev/accounts/enisatakann/projects/farming/builds/[BUILD_ID]
   ```

2. **"Install pods" bölümüne bak**, hangi pod hata veriyor:
   - Firebase → Çözüm 1 veya 2
   - Skia → Çözüm 3
   - react-native-worklets → Kaldır: `npm uninstall react-native-worklets`

3. **Son çare: EAS support'a sor:**
   ```
   https://expo.dev/accounts/enisatakann/projects/farming/builds/[BUILD_ID]
   ```
   sayfasında "Report issue" butonuna tıkla.

---

## 🎯 Özet Komutlar

```bash
# 1. Firebase'i kaldır (kullanmıyorsan)
npm uninstall @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore

# 2. Prebuild
npx expo prebuild --clean

# 3. iOS Build
eas build --platform ios --profile production

# 4. Submit (build başarılıysa)
eas submit --platform ios --profile production
```

---

## 💡 İpuçları

- **İlk build 20-30 dakika** sürebilir
- **CocoaPods hatası** en yaygın sorun, sabırlı ol
- **TestFlight** ile beta test yap, direkt production'a gönderme
- **App Review** süreci 1-3 gün sürer

---

**Son Güncelleme:** 10 Ocak 2026  
**Build Status:** 🔴 CocoaPods hatası - Firebase kaldırılması önerildi
