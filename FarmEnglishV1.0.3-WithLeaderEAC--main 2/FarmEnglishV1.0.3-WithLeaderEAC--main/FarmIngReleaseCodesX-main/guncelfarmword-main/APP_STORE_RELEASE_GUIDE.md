# 📱 FarmEnglish - App Store Yayınlama Rehberi

## 🎯 ÖNEMLİ NOTLAR
- **iOS build** için macOS gereklidir (EAS Build kullanarak veya macOS üzerinde)
- **Android build** Windows'ta yapılabilir
- Bu rehber EAS Build (Expo Application Services) kullanarak ilerleyecek

---

## 📋 HAZIRLIK AŞAMASI

### 1️⃣ Gerekli Hesaplar
- [ ] **Apple Developer Account** ($99/yıl)
  - https://developer.apple.com/programs/
  - Kayıt sonrası onay 24-48 saat sürebilir
  
- [ ] **Google Play Console** ($25 tek seferlik)
  - https://play.google.com/console/signup
  
- [ ] **Expo Account** (Ücretsiz)
  - https://expo.dev/signup

### 2️⃣ EAS CLI Kurulumu
```bash
npm install -g eas-cli
eas login
```

### 3️⃣ Proje Yapılandırması Kontrolü

**app.json** dosyasını kontrol et:
```json
{
  "expo": {
    "name": "FarmEnglish",
    "slug": "farming-kelime-oyunu",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.machinexus.farming.ios",
      "buildNumber": "1"
    },
    "android": {
      "package": "com.machinexus.farming",
      "versionCode": 1
    }
  }
}
```

**eas.json** dosyasını kontrol et (zaten mevcut):
```json
{
  "build": {
    "production": {
      "ios": {
        "buildConfiguration": "Release"
      },
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

---

## 🍎 IOS (APP STORE) YAYINLAMA

### ADIM 1: Apple Developer Hesabı Hazırlığı

1. **App Store Connect'e Giriş**
   - https://appstoreconnect.apple.com/
   - Apple Developer hesabınızla giriş yapın

2. **Yeni Uygulama Oluştur**
   - "My Apps" > "+" > "New App"
   - **Platform:** iOS
   - **Name:** FarmEnglish - Kelime Öğrenme Oyunu
   - **Primary Language:** Turkish
   - **Bundle ID:** `com.machinexus.farming.ios` (app.json'daki ile aynı olmalı)
   - **SKU:** farming-2026 (benzersiz bir tanımlayıcı)
   - **User Access:** Full Access

3. **App Bilgilerini Doldur**
   - Aşağıdaki detaylı metadata bölümüne bak
   - **Screenshots:** Zorunlu! (6.7", 6.5", 5.5" için)
   - **App Icon:** 1024x1024 px (alpha channel olmadan)

---

## 📝 APP STORE METADATA (KOPYALA-YAPIŞTIR HAZIR)

### 🎯 App Bilgileri

**App Name (30 karakter max):**
```
FarmEnglish - İngilizce Kelime
```
(28 karakter - ✅ SEO optimal: marka + ana keyword)

**Subtitle (30 karakter max):**
```
Oyun, Quiz, Dil Öğrenme
```
(25 karakter - ✅ SEO optimal: 3 popüler keyword)

**Promotional Text (170 karakter - güncellenebilir):**
```
🚜 Kelime ek, hasat et, akıcı konuş! 5000+ kelime, YDS/TOEFL/IELTS desteği. Günde 10 dakika = 1 yılda İngilizce ustası. Ücretsiz, reklamsız, offline! 🌾
```
(169 karakter - ✅ Çarpıcı, net value proposition)

### 📖 Description (4000 karakter max)

**⚡ İLK 3 SATIR ÇOK ÖNEMLİ (SEO + Conversion):**
```
Oyun Oynayarak İngilizce Öğren - FarmEnglish

YDS, TOEFL, IELTS'e mi hazırlanıyorsun? 4000+ kelime, phrasal verbs ve cümle kurma alıştırmaları ile vocabulary'ni katla! Çiftlik temalı oyunla öğrenme sıkıcı olmaktan çıkıyor.

Tamamen ücretsiz, reklamsız, internet gerektirmez. Günde 10 dakika yeter!
```

**TAM METİN:**
```
Oyun Oynayarak İngilizce Öğren - FarmEnglish

YDS, TOEFL, IELTS'e mi hazırlanıyorsun? 4000+ kelime, phrasal verbs ve cümle kurma alıştırmaları ile vocabulary'ni katla! Çiftlik temalı oyunla öğrenme sıkıcı olmaktan çıkıyor.

Tamamen ücretsiz, reklamsız, internet gerektirmez. Günde 10 dakika yeter!


NASIL ÇALIŞIR?

Tohum Ek
Her yeni kelime bir tohum gibi. Tarlana ek ve büyümeye başlasın.

Çalış & Ezbere
Mini quizler ile kelimeleri pratik et. Doğru cevaplarla bitkini büyüt!

Hasat Et
Kelimeyi tamamen öğrendiğinde hasat zamanı! Envanterin dolacak.

İlerle & Kilitle
Her başarı yeni seviyelerin kilidini açar. Ultra seviyesine ulaş!


ÖZELLİKLER

• 4000+ İngilizce kelime & örnek cümle
• Phrasal Verbs (deyimsel fiiller)
• Cümle kurma alıştırmaları
• Interaktif quiz sistemi
• İlerleme takibi & başarım sistemi
• Gamification (oyunlaştırma) mekanikleri
• Offline çalışma (internet gerektirmez)
• Günlük hatırlatmalar
• Kişiselleştirilmiş öğrenme hızı


OYUN MEKANİKLERİ

• Çalışma Streaki: Ardışık günlerde çalış, bonus kazan
• Combo Sistemi: Doğru cevap zincirleri oluştur
• Level Sistemi: Ultra seviyesine kadar tırman
• Başarım Rozetleri: Özel hedefleri tamamla
• Envanter Yönetimi: Kelime koleksiyonunu yönet


KİMLER İÇİN?

• İngilizce öğrenen herkes (A1'den C2'ye)
• Kelime dağarcığını genişletmek isteyenler
• Sınava hazırlananlar (YDS, TOEFL, IELTS)
• Oyun severek öğrenmek isteyenler
• Günde 10-15 dakika ayırabilen herkes


NEDEN FARMİNG?

Kelime öğrenirken eğlenmek isteyenlere özel tasarlandı:

• Oyun mekanikleriyle motivasyon her gün yüksek
• Görsel ilerleme takibi: Tarlayı büyüyüşünü gör, hedefine odaklan
• Gamification sistemi ile sürekli ilham al
• Bilimsel "Spaced Repetition" yöntemiyle kalıcı öğrenme
• Sıfır reklam, sıfır dikkat dağınıklığı


BİLİMSEL YÖNTEM

FarmEnglish, bilimsel olarak kanıtlanmış "Spaced Repetition" (aralıklı tekrar) yöntemini kullanır. Bu sayede kelimeler uzun süreli hafızana yerleşir.


İÇERİK

• Temel kelimeler (A1-A2)
• Orta seviye (B1-B2)
• İleri seviye (C1-C2)
• Phrasal Verbs (deyimsel fiiller)
• Günlük konuşma kelimeleri
• İş İngilizcesi
• Akademik kelimeler


GİZLİLİK & GÜVENLİK

• Hiçbir kişisel veri toplanmaz
• İnternet bağlantısı gerektirmez
• Reklamsız deneyim
• KVKK uyumlu


HEMEN BAŞLA!

İndirip ilk tohumunu ek, kelime tarlayı büyümeye başlasın! Her gün birkaç dakika ile İngilizce seviyeni artır.


DESTEK & GERİ BİLDİRİM

Sorularınız mı var? Önerilerinizi dinliyoruz!
Email: support@machinexus.com

Happy Farming!
```
```
� Oyun Oynayarak İngilizce Öğren - FarmEnglish

YDS, TOEFL, IELTS'e mi hazırlanıyorsun? 4000+ kelime, phrasal verbs ve cümle kurma alıştırmaları ile vocabulary'ni katla! Çiftlik temalı oyunla öğrenme sıkıcı olmaktan çıkıyor.

✨ Tamamen ücretsiz, reklamsız, internet gerektirmez. Günde 10 dakika yeter!

✨ NASIL ÇALIŞIR?

🌱 Tohum Ek
Her yeni kelime bir tohum gibi. Tarlana ek ve büyümeye başlasın.

📚 Çalış & Ezbere
Mini quizler ile kelimeleri pratik et. Doğru cevaplarla bitkini büyüt!

🌾 Hasat Et
Kelimeyi tamamen öğrendiğinde hasat zamanı! Envanterin dolacak.

🎯 İlerle & Kilitle
Her başarı yeni seviyelerin kilidini açar. Ultra seviyesine ulaş!

🌟 ÖZELLİKLER

✅ 4000+ İngilizce kelime & örnek cümle
✅ Phrasal Verbs (deyimsel fiiller)
✅ Cümle kurma alıştırmaları
✅ Interaktif quiz sistemi
✅ İlerleme takibi & başarım sistemi
✅ Gamification (oyunlaştırma) mekanikleri
✅ Offline çalışma (internet gerektirmez)
✅ Günlük hatırlatmalar
✅ Kişiselleştirilmiş öğrenme hızı

🎮 OYUN MEKANİKLERİ

• Çalışma Streaki: Ardışık günlerde çalış, bonus kazan
• Combo Sistemi: Doğru cevap zincirleri oluştur
• Level Sistemi: Ultra seviyesine kadar tırman
• Başarım Rozetleri: Özel hedefleri tamamla
• Envanter Yönetimi: Kelime koleksiyonunu yönet

🧠 KİMLER İÇİN?

• İngilizce öğrenen herkes (A1'den C2'ye)
• Kelime dağarcığını genişletmek isteyenler
• Sınava hazırlananlar (YDS, TOEFL, IELTS)
• Oyun severek öğrenmek isteyenler
• Günde 10-15 dakika ayırabilen herkes

🏆 NEDEN FARMİNG?

Geleneksel kelime uygulamaları sıkıcı ve motivas yonsuz. FarmEnglish ile:
• Eğlenceli ve bağımlılık yapan gameplay
• Görsel ilerleme takibi (tarlayı büyüyüşünü gör)
• Gamification ile sürekli motivasyon
• Bilimsel aralıklı tekrar sistemi
• Sıfır reklam, sıfır dikkat dağınıklığı

📊 BİLİMSEL YÖNTEM

FarmEnglish, bilimsel olarak kanıtlanmış "Spaced Repetition" (aralıklı tekrar) yöntemini kullanır. Bu sayede kelimeler uzun süreli hafızana yerleşir.

🎓 İÇERİK

• Temel kelimeler (A1-A2)
• Orta seviye (B1-B2)
• İleri seviye (C1-C2)
• Phrasal Verbs (deyimsel fiiller)
• Günlük konuşma kelimeleri
• İş İngilizcesi
• Akademik kelimeler

🔒 GİZLİLİK & GÜVENLİK

• Hiçbir kişisel veri toplanmaz
• İnternet bağlantısı gerektirmez
• Reklamsız deneyim
• KVKK uyumlu

🌱 HEMEN BAŞLA!

İndirip ilk tohumunu ek, kelime tarlayı büyümeye başlasın! Her gün birkaç dakika ile İngilizce seviyeni artır.

📧 DESTEK & GERİ BİLDİRİM

Sorularınız mı var? Önerilerinizi dinliyoruz!
Email: support@machinexus.com

Happy Farming!
```

### 🔑 Keywords (100 karakter max, virgülle ayır)

**🎯 EN UYGUN KEYWORD SET:**
```
vocabulary,farm,farming,çiftlik,YDS,TOEFL,IELTS,sınav,eğitim,pratik,test,kelime oyunu
```
(96 karakter - ✅ PERFECT!)

**NEDEN BU EN İYİ:**
- ✅ **vocabulary**: Yüksek arama hacmi, düşük rekabet
- ✅ **farm/farming/çiftlik**: Unique tema, rakiplerden farklılaşma
- ✅ **YDS/TOEFL/IELTS**: Net hedef kitle (sınav hazırlananlar)
- ✅ **kelime oyunu**: Long-tail, düşük rekabet
- ✅ **test/sınav/pratik/eğitim**: Kullanım senaryoları

**App Name/Subtitle'da ZATEN VAR (tekrarlama):**
- ❌ İngilizce (app name'de)
- ❌ Kelime (app name'de)
- ❌ Oyun (subtitle'da)
- ❌ Quiz (subtitle'da)
- ❌ Dil (subtitle'da)
- ❌ Öğrenme (subtitle'da)

**❌ YAPMA:**
- App Name veya Subtitle'daki kelimeleri tekrarlama (Apple zaten indexliyor)
- Boşluk kullanma (sadece virgül)
- Alakasız kelimeler ekleme

**✅ YAP:**
- Rakiplerin keywords'lerini araştır (Duolingo, Memrise, Babbel)
- Uygulamanın temasını yansıt (farm/çiftlik)
- Sınav keywords (YDS, TOEFL, IELTS)

**Alternatif Keyword Setleri (A/B test için):**

**Set 1 (Sınav + Tema odaklı):**
```
vocabulary,farm,çiftlik,YDS,TOEFL,IELTS,sınav,hazırlık,test,eğitim,pratik,kelime,word
```

**Set 2 (Oyun + Tema odaklı):**
```
vocabulary,farm game,çiftlik oyunu,quiz,eğitim,pratik,kelime,word,eğlenceli,öğrenme
```

**Set 3 (Geniş kapsam - ÖNERİLEN):**
```
vocabulary,farm,farming,çiftlik,YDS,TOEFL,IELTS,sınav,eğitim,pratik,test,kelime oyunu
```
(96 karakter - ✅ SEO + Tema + Hedef kitle PERFECT!)

**NEDEN SET 3 EN İYİ:**
- ✅ **vocabulary**: En yüksek arama hacmi (global keyword)
- ✅ **farm/farming/çiftlik**: Uygulama teması (unique positioning)
- ✅ **YDS/TOEFL/IELTS**: Hedef kitle (sınava hazırlananlar)
- ✅ **kelime oyunu**: Long-tail keyword (düşük rekabet)
- ✅ **test/sınav/pratik**: Kullanım senaryoları
- ✅ **eğitim**: Kategori keyword

**🎯 KULLAN BUNU:**
```
vocabulary,farm,farming,çiftlik,YDS,TOEFL,IELTS,sınav,eğitim,pratik,test,kelime oyunu
```

**❌ YAPMA:**
- App Name veya Subtitle'daki kelimeleri tekrarlama (Apple zaten indexliyor)
- Boşluk kullanma (sadece virgül)
- Alakasız kelimeler ekleme

**✅ YAP:**
- Rakiplerin keywords'lerini araştır (Duolingo, Memrise, Babbel)
- Uzun kuyruk keywords: "YDS kelime", "TOEFL hazırlık"
- Rakip marka ismi YAZMA (Apple reddeder)

**Alternatif Keyword Setleri (A/B test için):**

**Set 1 (Sınav odaklı):**
```
vocabulary,YDS,TOEFL,IELTS,sınav,hazırlık,test,quiz,eğitim,pratik,öğren,dil,kelimeler,english
```

**Set 2 (Oyun odaklı):**
```
vocabulary,oyun,quiz,eğitim,öğren,pratik,dil,kelimeler,english,learn,eğlenceli,çalış,hafıza
```

**Set 3 (Geniş kapsam):**
```
vocabulary,eğitim,öğren,sınav,YDS,TOEFL,IELTS,pratik,test,quiz,çalış,hafıza,kelimeler,english,dil,learn
```

### 🏷️ Categories (2 adet seç)

**Primary Category:** Education (Eğitim)  
**Secondary Category:** Games > Word (Oyunlar > Kelime)

### 🔞 Age Rating

**Age Rating Questionnaire Cevapları:**
- Cartoon or Fantasy Violence: None
- Realistic Violence: None
- Sexual Content or Nudity: None
- Profanity or Crude Humor: None
- Alcohol, Tobacco, or Drug Use: None
- Mature/Suggestive Themes: None
- Simulated Gambling: None
- Horror/Fear Themes: None
- Medical/Treatment Information: None
- Unrestricted Web Access: No
- Gambling and Contests: No

**Sonuç:** 4+ (Herkes)

### 💰 Pricing & Availability

**Price:** Free (Ücretsiz)  
**Availability:** All countries (Tüm ülkeler)  
**Specific Countries:** Turkey, United States, United Kingdom, Germany, France

### 🛡️ Privacy Policy URL

```
https://github.com/[USERNAME]/farming/blob/main/PRIVACY_POLICY.md
```

**VEYA** (önerilen):
```
https://machinexus.com/farming/privacy-policy
```

### ℹ️ App Privacy (Veri Toplama)

**Data Collection:** None  
✅ We do not collect data from this app

**Checkboxes:**
- [ ] Contact Info
- [ ] Health & Fitness
- [ ] Financial Info
- [ ] Location
- [ ] Sensitive Info
- [ ] Contacts
- [ ] User Content
- [ ] Browsing History
- [ ] Search History
- [ ] Identifiers
- [ ] Purchases
- [ ] Usage Data
- [ ] Diagnostics
- [x] **Other Data** > Game Progress (offline only, not collected)

### 📞 Support & Marketing URLs

**Support URL (Zorunlu):**
```
https://github.com/[USERNAME]/farming/issues
```

**Marketing URL (Opsiyonel):**
```
https://machinexus.com/farming
```

### 📧 Contact Information

**Email:**
```
support@machinexus.com
```

**Phone:** (Opsiyonel - boş bırakılabilir)

---

## 🤖 GOOGLE PLAY METADATA (KOPYALA-YAPIŞTIR HAZIR)

### 📱 App Details

**App Name (50 karakter max):**
```
FarmEnglish - İngilizce Kelime Öğrenme Oyunu
```

**Short Description (80 karakter max):**
```
Çift, hasat et, öğren! İngilizce kelime öğrenme artık bir oyun 🌾🎮
```

### 📖 Full Description (4000 karakter max)

```
🌾 Kelime Tarlana Hoş Geldin!

FarmEnglish ile İngilizce kelime öğrenme artık bir oyun! Tohumları ek, çalış, hasat et ve kelime hazinen büyüsün.

✨ NASIL ÇALIŞIR?

🌱 Tohum Ek
Her yeni kelime bir tohum gibi. Tarlana ek ve büyümeye başlasın.

📚 Çalış & Ezbere
Mini quizler ile kelimeleri pratik et. Doğru cevaplarla bitkini büyüt!

🌾 Hasat Et
Kelimeyi tamamen öğrendiğinde hasat zamanı! Envanterin dolacak.

🎯 İlerle & Kilitle
Her başarı yeni seviyelerin kilidini açar. Ultra seviyesine ulaş!

🌟 ÖZELLİKLER

✅ 5000+ İngilizce kelime & örnek cümle
✅ Sesli telaffuz desteği
✅ Interaktif quiz sistemi
✅ İlerleme takibi & başarım sistemi
✅ Gamification (oyunlaştırma) mekanikleri
✅ Offline çalışma (internet gerektirmez)
✅ Günlük hatırlatmalar
✅ Kişiselleştirilmiş öğrenme hızı
✅ Tamamen ücretsiz - reklamsız!

🎮 OYUN MEKANİKLERİ

• Çalışma Streaki: Ardışık günlerde çalış, bonus kazan
• Combo Sistemi: Doğru cevap zincirleri oluştur
• Level Sistemi: Ultra seviyesine kadar tırman
• Başarım Rozetleri: Özel hedefleri tamamla
• Envanter Yönetimi: Kelime koleksiyonunu yönet

🧠 KİMLER İÇİN?

• İngilizce öğrenen herkes (A1'den C2'ye)
• Kelime dağarcığını genişletmek isteyenler
• Sınava hazırlananlar (YDS, TOEFL, IELTS)
• Oyun severek öğrenmek isteyenler
• Günde 10-15 dakika ayırabilen herkes

🏆 NEDEN FARMİNG?

Geleneksel kelime uygulamaları sıkıcı ve motivasyonsuz. FarmEnglish ile:
• Eğlenceli ve bağımlılık yapan gameplay
• Görsel ilerleme takibi (tarlayı büyüyüşünü gör)
• Gamification ile sürekli motivasyon
• Bilimsel aralıklı tekrar sistemi
• Sıfır reklam, sıfır dikkat dağınıklığı

📊 BİLİMSEL YÖNTEM

FarmEnglish, bilimsel olarak kanıtlanmış "Spaced Repetition" (aralıklı tekrar) yöntemini kullanır. Bu sayede kelimeler uzun süreli hafızana yerleşir.

🎓 İÇERİK

• Temel kelimeler (A1-A2)
• Orta seviye (B1-B2)
• İleri seviye (C1-C2)
• Phrasal Verbs (deyimsel fiiller)
• Günlük konuşma kelimeleri
• İş İngilizcesi
• Akademik kelimeler

🔒 GİZLİLİK & GÜVENLİK

• Hiçbir kişisel veri toplanmaz
• İnternet bağlantısı gerektirmez
• Reklamsız deneyim
• KVKK uyumlu

🌱 HEMEN BAŞLA!

İndirip ilk tohumunu ek, kelime tarlayı büyümeye başlasın! Her gün birkaç dakika ile İngilizce seviyeni artır.

📧 DESTEK & GERİ BİLDİRİM

Sorularınız mı var? Önerilerinizi dinliyoruz!
Email: support@machinexus.com

🌾 Happy Farming! 🚜

---

ANAHTAR KELİMELER: ingilizce öğren, kelime öğrenme, vocabulary, quiz game, eğitim oyunu, dil öğrenme, farming game, çiftlik oyunu, education, word game
```

### 🏷️ Category & Tags

**Category:** Education  
**Tags:** 
- Educational
- Language Learning
- Word Games
- Casual
- Single Player

### 🔞 Content Rating (IARC)

**Questionnaire Cevapları:**
- Violence: None
- Sexuality: None
- Language: None
- Controlled Substances: None
- Gambling: None
- User Interaction: None
- Shares Location: No
- Shares Personal Info: No
- Digital Purchases: No

**Sonuç:** Everyone (3+)

### 💰 Pricing & Distribution

**Price:** Free  
**Contains Ads:** No  
**In-app Purchases:** No  
**Countries:** Available worldwide

### 🌐 Contact Details

**Email:**
```
support@machinexus.com
```

**Website:**
```
https://machinexus.com/farming
```

**Privacy Policy URL (Zorunlu):**
```
https://machinexus.com/farming/privacy-policy
```

### ADIM 2: EAS ile iOS Build

```bash
# EAS projesini yapılandır (ilk kez)
eas build:configure

# iOS Production build başlat
eas build --platform ios --profile production

# Build süreci:
# 1. Apple Developer credentials soracak (otomatik oluşturabilir)
# 2. Push Notification sertifikası soracak (gerekirse)
# 3. Distribution sertifikası oluşturacak
# 4. Provisioning profile oluşturacak
# 5. Cloud'da build edecek (15-30 dk)
```

**Build Tamamlandığında:**
- EAS Dashboard'dan `.ipa` dosyasını indir
- VEYA direkt App Store Connect'e yükle: `eas submit --platform ios`

### ADIM 3: TestFlight ile Test

1. **TestFlight Sekmesi**
   - App Store Connect > TestFlight
   - Build otomatik görünecek (processing bittikten sonra)
   
2. **Internal Testing**
   - En fazla 100 internal tester ekleyebilirsin
   - Hızlı onay, anında test başlar
   
3. **External Testing** (Opsiyonel)
   - 10,000 external tester ekleyebilirsin
   - Apple review gerekir (~24 saat)

### ADIM 4: App Store Review'a Gönder

1. **App Store Connect > App Information**
   - Tüm metadata'yı doldur
   - Screenshots yükle (ZORUNLU)
   - Privacy bilgilerini doldur
   - Age Rating belirle

2. **Pricing and Availability**
   - Ücretsiz olarak belirle
   - Ülkeleri seç (Türkiye dahil)

3. **Submit for Review**
   - Version 1.0.0 için "Submit for Review"
   - Review süresi: 24-72 saat
   - Reddedilirse feedback'e göre düzelt ve tekrar gönder

---

## 🤖 ANDROID (GOOGLE PLAY) YAYINLAMA

### ADIM 1: Google Play Console Hazırlığı

1. **Console'a Giriş**
   - https://play.google.com/console/
   - Google hesabınızla giriş

2. **Yeni Uygulama Oluştur**
   - "Create app"
   - **App name:** FarmEnglish - Kelime Öğrenme Oyunu
   - **Default language:** Turkish
   - **App or Game:** Game
   - **Free or Paid:** Free

3. **Store Listing Doldur**
   - **Short description:** 80 karakter
   - **Full description:** 4000 karakter
   - **App icon:** 512x512 px
   - **Feature graphic:** 1024x500 px
   - **Screenshots:** En az 2 adet (phone, 7" tablet, 10" tablet)
   - **Privacy Policy:** URL gerekli

### ADIM 2: EAS ile Android Build

```bash
# Android Production build (AAB - App Bundle)
eas build --platform android --profile production

# Keystore oluşturma:
# - İlk build'de EAS otomatik oluşturur
# - Sonraki versiyonlarda aynı keystore kullanılır (önemli!)
# - Keystore'u kaybetme! Güvenli yerde sakla

# Build süreci:
# 1. Credentials hazırlanır
# 2. Cloud'da build edilir (10-20 dk)
# 3. .aab dosyası oluşur
```

**Build Tamamlandığında:**
- `.aab` dosyasını indir
- VEYA direkt Play Console'a yükle: `eas submit --platform android`

### ADIM 3: Internal Testing

1. **Testing > Internal Testing**
   - "Create new release"
   - AAB dosyasını yükle
   - Release notes yaz
   - "Review release" > "Start rollout"

2. **Test Kullanıcıları Ekle**
   - Email listesi oluştur
   - Test kullanıcılarına link gönder
   - Feedback topla

### ADIM 4: Production'a Yükle

1. **Production Track**
   - Production > "Create new release"
   - AAB dosyasını yükle
   - Release notes yaz (Türkçe)
   - "Review release"

2. **Content Rating Doldur**
   - Questionnaire doldur
   - Yaş derecelendirmesi al

3. **Submit for Review**
   - Tüm gereksinimler tamamsa "Submit"
   - İlk review: 3-7 gün
   - Sonraki güncellemeler: 1-3 gün

---

## 🔄 VERSION GÜNCELLEME

### iOS Version Bump
```bash
# app.json
"version": "1.0.1",  # Artır
"ios": {
  "buildNumber": "2"  # Artır (her build için)
}
```

### Android Version Bump
```bash
# app.json
"version": "1.0.1",  # Artır
"android": {
  "versionCode": 2  # Artır (her build için integer)
}
```

### Güncelleme Build ve Submit
```bash
# Yeni build
eas build --platform all --profile production

# Submit
eas submit --platform ios
eas submit --platform android
```

---

## 📸 SCREENSHOT GEREKSİNİMLERİ

### iOS
- **iPhone 6.7"** (iPhone 15 Pro Max): 1290 x 2796 px
- **iPhone 6.5"** (iPhone 11 Pro Max): 1242 x 2688 px
- **iPhone 5.5"** (iPhone 8 Plus): 1242 x 2208 px

### Android
- **Phone:** 16:9 veya 9:16 (min 320px)
- **7" Tablet:** 1024 x 600 px
- **10" Tablet:** 1920 x 1200 px

**Öneriler:**
- En az 3-5 screenshot hazırla
- Özellik vurgularını göster
- Türkçe metinler ekle
- Parlak renkler kullan

---

## ✅ ÖNCELİKLİ YAPILACAKLAR

1. **Apple Developer Account aç** ($99/yıl)
2. **Google Play Console aç** ($25 tek)
3. **Expo hesabına login:** `eas login`
4. **app.json'da version kontrolü**
5. **Screenshot'ları hazırla** (en önemli!)
6. **App icon 1024x1024** hazırla
7. **Privacy Policy URL'i hazırla** (KVKK.md'den)
8. **İlk build:** `eas build --platform all --profile production`

---

## 🚨 SIKÇA KARŞILAŞILAN SORUNLAR

### iOS Build Hatası: Missing Credentials
**Çözüm:** `eas credentials` ile manuel ayarla

### Android Build Hatası: Keystore
**Çözüm:** İlk build'de EAS otomatik oluşturur, bekle

### App Store Rejection: Missing Privacy Policy
**Çözüm:** KVKK.md'i bir web sayfasına yükle, URL'i ekle

### Screenshots Yetersiz
**Çözüm:** Tüm required boyutlarda en az 1 screenshot ekle

---

## 🎊 YAYINLANMA SONRASI

### Monitoring
- **App Store Connect:** İndirme istatistikleri
- **Google Play Console:** Kullanıcı yorumları, crash reports
- **Analytics:** Firebase/Mixpanel entegre et

### Update Strategy
- Bug fix: 1-2 haftada bir
- Feature update: Ayda bir
- Version naming: Semantic versioning (1.0.0 → 1.0.1 → 1.1.0)

---

## 📞 YARDIM KAYNAKLARI

- **Expo Docs:** https://docs.expo.dev/
- **EAS Build:** https://docs.expo.dev/build/introduction/
- **App Store Guidelines:** https://developer.apple.com/app-store/review/guidelines/
- **Play Store Policies:** https://play.google.com/about/developer-content-policy/

---

**İyi şanslar! 🚀**
