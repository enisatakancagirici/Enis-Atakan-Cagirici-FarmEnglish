# Kişisel Verilerin Korunması Hakkında Aydınlatma Metni

Bu metin, FarmEnglish mobil uygulaması kapsamında kişisel verilerin işlenmesine ilişkin olarak hazırlanmıştır.

## 1. Veri Sorumlusu

Veri Sorumlusu:
Enis Atakan Çağırıcı
FarmEnglish Uygulaması Geliştiricisi
E-posta: enisatakann@gmail.com


## 2. Uygulama Modları ve Veri İşleme

FarmEnglish uygulaması üç farklı modda çalışmaktadır:

### 2.1 Çevrimdışı Mod

Bu modda hiçbir kişisel veri toplanmaz. Tüm ilerleme bilgileri yalnızca cihazınızda (AsyncStorage) saklanır, sunucuya hiçbir veri gönderilmez.

### 2.2 Online Mod (Çevrimiçi)

Online modda kullanıcılar bir **kullanıcı adı** ile giriş yapabilmektedir. Bu modda aşağıdaki veriler işlenmektedir:

- **Kullanıcı adı** (kullanıcı tarafından belirlenir)
- **Puan ve sıralama bilgileri** (liderboard)
- **Oyun istatistikleri** (maç sonuçları, kazanma/kaybetme)

Bu veriler **Google Firebase** altyapısı (Firestore / Realtime Database) üzerinde saklanmaktadır. Veri sorumlusu kendi sunucusunda herhangi bir veri tutmamaktadır. Firebase'in gizlilik politikası için bkz.: https://firebase.google.com/support/privacy

### 2.3 Sesyap Modu (Konuşma Tanıma)

Sesyap modunda kullanıcı sesli olarak İngilizce kelimeler söylemekte, bu ses kaydı tanınmak üzere işlenmektedir. Bu modda:

- Ses verisi **Google Speech Recognition API** aracılığıyla işlenmekte ve ilgili kelimeyle eşleştirilmektedir.
- Ses kaydı **yalnızca anlık tanıma amacıyla** Google'ın sunucularına iletilir; kalıcı olarak saklanmaz.
- Kelime eşleşme sonuçları ile ilerleme verileri **Google Firebase** veritabanında tutulmaktadır.
- Veri sorumlusu (geliştirici) **kendi sunucusunda ses kaydı veya kişisel veri toplamamaktadır.**

Google'ın ses verileri işleme politikası için bkz.: https://policies.google.com/privacy

## 3. İşlenen Kişisel Veriler

FarmEnglish uygulaması kapsamında aşağıdaki kişisel veriler işlenmektedir:

### 3.1 Kullanıcı Tarafından Sağlanan Veriler

- Kullanıcı adı (Online mod için zorunlu)
- Takma ad (isteğe bağlı, çevrimdışı mod)
- Quiz cevapları ve öğrenme etkileşimleri
- İlerleme bilgileri (puan, seviye, başarılar)
- Kullanıcı tercihleri (ses, titreşim ayarları)

### 3.2 Uygulama Moduna Göre Veri Akışı

| Veri Türü | Çevrimdışı | Online | Sesyap |
|---|---|---|---|
| Kullanıcı adı | Cihazda | Firebase | Firebase |
| Puan/İstatistik | Cihazda | Firebase | Firebase |
| Ses kaydı | Yok | Yok | Google API (anlık) |
| Konum/IP/Cihaz | Toplanmaz | Toplanmaz | Toplanmaz |

### 3.3 Otomatik Olarak Toplanan Veriler

FarmEnglish **analitik, reklam veya izleme aracı kullanmaz.** Cihaz bilgileri, konum veya IP adresi toplanmamaktadır.

## 4. Kişisel Verilerin İşlenme Amaçları

- Uygulama hizmetlerinin sunulması
- Kullanıcı profilinin oluşturulması ve yönetilmesi (Online mod)
- Öğrenme sürecinin takip edilmesi (quiz sonuçları, puan)
- Liderboard ve rekabetçi sıralama hizmetinin sağlanması (Online mod)
- Sesli kelime tanıma özelliğinin sunulması (Sesyap modu)
- Kullanıcı deneyiminin kişiselleştirilmesi

## 5. Üçüncü Taraf Hizmetler

Aşağıdaki üçüncü taraf hizmetler kullanılmaktadır:

### Google Firebase (Online Mod & Sesyap Modu)
- **Kullanılan servisler:** Firestore / Realtime Database
- **Amaç:** Kullanıcı adı, puan ve oyun istatistiklerinin saklanması
- **Veri konumu:** Google'ın sunucuları (Avrupa veya ABD bölgesi)
- **Politika:** https://firebase.google.com/support/privacy

### Google Speech Recognition API (Sesyap Modu)
- **Kullanılan servis:** Google Cloud Speech-to-Text
- **Amaç:** Kullanıcının sesini metne dönüştürerek kelime eşleştirme
- **Saklama:** Ses kaydı kalıcı olarak saklanmaz; yalnızca anlık işleme için iletilir
- **Politika:** https://policies.google.com/privacy

## 6. Kişisel Verilerin Saklanması ve Güvenliği

- Çevrimdışı mod verileri yalnızca kullanıcının cihazında saklanır
- Online mod ve Sesyap modu verileri Google Firebase'in güvenli altyapısında saklanır
- Veri sorumlusu kendi merkezi sunucusunu işletmemektedir
- Firebase verileri şifreleme ve erişim kontrolü ile korunmaktadır

## 7. Kişisel Verilerin Aktarılması

Kişisel verileriniz:

- ❌ Üçüncü kişilerle ticari amaçla paylaşılmaz
- ❌ Satılmaz veya reklam faaliyetlerinde kullanılmaz
- ✅ Google Firebase altyapısına (Online ve Sesyap modlarında) aktarılır
- ✅ Google Speech API'ye (Sesyap modunda, yalnızca anlık işleme)

Yalnızca kanuni yükümlülükler kapsamında yetkili kurumlara aktarılabilir.

## 8. Saklama Süresi

- Cihaz verileri: Uygulama yüklü olduğu sürece saklanır; uygulama silindiğinde kalıcı olarak silinir
- Firebase verileri: Hesap silme talebi üzerine silinir; hesap aktif olduğu sürece saklanır
- Ses verileri: Google Speech API tarafından anlık olarak işlenir, kalıcı saklanmaz

## 9. KVKK Kapsamındaki Haklarınız

6698 sayılı Kanun'un 11. maddesi uyarınca kullanıcılar:

- Kişisel verilerinin işlenip işlenmediğini öğrenme
- Kişisel verilere erişme
- Yanlış veya eksik verilerin düzeltilmesini isteme
- Verilerin silinmesini veya yok edilmesini talep etme
- Veri işlemeye itiraz etme

haklarına sahiptir.

## 10. İletişim

KVKK kapsamındaki talepleriniz için:

📧 E-posta: enisatakann@gmail.com

## 11. Güncellemeler

Bu aydınlatma metni gerekli görüldüğü takdirde güncellenebilir.
Güncellemeler uygulama güncellemeleri ile duyurulur.

Son Güncelleme: 25 Şubat 2026
FarmEnglish Uygulaması – Sürüm 1.0.3
