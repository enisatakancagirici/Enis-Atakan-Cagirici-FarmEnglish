import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { AppState, AppStateStatus } from 'react-native';

// 🔊 PREMIUM SES SİSTEMİ - Her Aksiyon için Mükemmel Ses
type SoundKey = 'correct' | 'wrong' | 'harvest' | 'combo' | 'levelup' | 'tap' | 'swipe' | 'plant' | 'coin' | 'success' | 'pop' | 'click' | 'unlock' | 'ding' | 'celebration' | 'tick' | 'alarm' | 'spray';

// 📦 LOCAL ASSETS - Tüm sesler local'den yükleniyor (internetsiz çalışır!)
const LOCAL_SOUNDS: Record<SoundKey, any> = {
  correct: require('../../assets/sfx/correct.mp3'),
  wrong: require('../../assets/sfx/wrong.mp3'),
  harvest: require('../../assets/sfx/harvest.mp3'),
  combo: require('../../assets/sfx/success.mp3'),
  levelup: require('../../assets/sfx/levelup.mp3'),
  tap: require('../../assets/sfx/tap.mp3'),
  swipe: require('../../assets/sfx/tap.mp3'),
  plant: require('../../assets/sfx/tap.mp3'),
  coin: require('../../assets/sfx/coin.mp3'),
  success: require('../../assets/sfx/success.mp3'),
  pop: require('../../assets/sfx/pop.mp3'),
  click: require('../../assets/sfx/tap.mp3'),
  unlock: require('../../assets/sfx/success.mp3'),
  ding: require('../../assets/sfx/ding.mp3'),          // 🔔 Pit pit tatlı ses!
  celebration: require('../../assets/sfx/celebration.mp3'),  // 🎉 Canlı kutlama!
  tick: require('../../assets/sfx/tap.mp3'),
  alarm: require('../../assets/sfx/wrong.mp3'),
  spray: require('../../assets/sfx/spray.mp3'),
};

// 🎚️ Hacim Seviyeleri - Dengeli ve Hoş
const VOLUME_LEVELS: Record<SoundKey, number> = {
  correct: 0.30,    // Net ama hafif
  wrong: 0.25,      // Çok hafif - rahatsız etmesin
  harvest: 0.40,    // Orta - önemli an
  combo: 0.30,      // Hafif - çok karışık olmasın
  levelup: 0.45,    // Yüksek - kutlama
  tap: 0.15,        // Çok hafif - sadece hissettir
  swipe: 0.20,      // Hafif
  plant: 0.30,      // Orta
  coin: 0.35,       // Orta - tatmin edici
  success: 0.35,    // Orta
  pop: 0.30,        // Orta
  click: 0.25,      // Hafif - quiz açılış
  unlock: 0.40,     // Orta - kilit açma
  ding: 0.35,       // Orta - tatlı pit pit sesi
  celebration: 0.40, // Orta - canlı combo sesi
  tick: 0.25,        // Hafif - her saniye
  alarm: 0.35,       // Orta - son saniyeler uyarı
  spray: 0.40,       // Orta - pssss ilaçlama sesi
};

// 🎵 Akıllı Ses Yöneticisi
class SoundManager {
  private sounds: Map<SoundKey, Audio.Sound> = new Map();
  private isEnabled: boolean = true;
  private isLoading: boolean = false;
  private lastPlayTime: Map<SoundKey, number> = new Map();
  private minInterval: number = 30; // ms - daha düşük gecikme için azalttık
  private audioInitialized: boolean = false;
  private lastAudioInit: number = 0;
  private recordingActive: boolean = false;

  constructor() {
    this.loadSettings();
    this.initAudio();
    this.preloadAllSounds(); // 🚀 Başlangıçta tüm sesleri yükle
    this.setupAppStateListener(); // 🔊 Uygulama ön plana gelince ses sistemini yenile
    // 🔊 Ekstra kontrol - ilk açılışta audio session'ı 1 saniye sonra tekrar yenile
    setTimeout(() => this.refreshAudioSession(), 1000);
  }

  // 🔊 Uygulama ön plana geldiğinde ses sistemini yeniden başlat
  private setupAppStateListener() {
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Uygulama ön plana geldi - ses sistemini yenile
        // (telefon sessizden çıkmış olabilir)
        this.refreshAudioSession();
      }
    });
  }

  // 🔊 Ses session'ını yenile (sessiz moddan çıkıldığında)
  async refreshAudioSession() {
    const now = Date.now();
    // Son 1 saniye içinde zaten yenilenmişse tekrar yapma
    if (now - this.lastAudioInit < 1000) return;
    this.lastAudioInit = now;
    
    try {
      // 🔊 Audio modunu zorla ayarla - telefonun sessiz olup olmadığından bağımsız
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true, // 🔊 Sessiz modda MUTLAKA çalsın!
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        allowsRecordingIOS: false,
        interruptionModeIOS: 1,
        interruptionModeAndroid: 1,
        playThroughEarpieceAndroid: false,
      });
      this.audioInitialized = true;
    } catch (e) {
      // Başarısız olursa flag'i false yap ki tekrar denesin
      this.audioInitialized = false;
    }
  }

  private async loadSettings() {
    try {
      const stored = await AsyncStorage.getItem('farmword:sounds');
      if (stored === null) {
        // 🔊 İlk açılış - ses varsayılan AÇIK olsun!
        this.isEnabled = true;
        await AsyncStorage.setItem('farmword:sounds', 'on');
      } else {
        this.isEnabled = stored !== 'off';
      }
    } catch (e) {
      // Hata olsa bile ses açık kalsın
      this.isEnabled = true;
    }
  }

  private async initAudio() {
    try {
      // 🔊 iOS ve Android için ses modunu ayarla
      // Birkaç kez dene - bazı cihazlarda ilk seferde çalışmayabiliyor
      let success = false;
      let attempts = 0;
      const maxAttempts = 5; // Daha fazla deneme
      
      while (!success && attempts < maxAttempts) {
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true, // 🔊 Sessiz modda MUTLAKA çalsın!
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
            allowsRecordingIOS: false,
            interruptionModeIOS: 1, // DoNotMix
            interruptionModeAndroid: 1, // DoNotMix
            playThroughEarpieceAndroid: false, // 🔊 Hoparlörden çalsın
          });
          success = true;
          this.audioInitialized = true;
          this.lastAudioInit = Date.now();
        } catch (retryError) {
          attempts++;
          // Kısa bekle ve tekrar dene
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      // 🔊 Başarısız olsa bile flag'i true yap - ilk ses çalışında tekrar denesin
      if (!success) {
        this.audioInitialized = false;
      }
    } catch (e) {
      // Son çare - en azından temel ayarlarla dene
      this.audioInitialized = false;
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
        this.audioInitialized = true;
      } catch (fallbackError) {
        // İlk ses çalışında tekrar denesin
        this.audioInitialized = false;
      }
    }
  }

  // 🚀 TÜM SESLERİ BAŞLANGIŞTA YÜKLE - Gecikme önleme
  private async preloadAllSounds() {
    const keys: SoundKey[] = ['correct', 'wrong', 'harvest', 'combo', 'levelup', 'tap', 'swipe', 'plant', 'coin', 'success', 'pop', 'click', 'unlock', 'ding', 'celebration', 'tick', 'alarm', 'spray'];
    
    for (const key of keys) {
      try {
        const localAsset = LOCAL_SOUNDS[key];
        if (localAsset) {
          const { sound } = await Audio.Sound.createAsync(
            localAsset,
            { volume: VOLUME_LEVELS[key], shouldPlay: false }
          );
          this.sounds.set(key, sound);
        }
      } catch (e) {
        // Sessizce devam et
      }
    }
  }

  // 🔊 Ses yükle (artık sadece cache'den çek)
  private async loadSound(key: SoundKey): Promise<Audio.Sound | null> {
    // Preload edilmiş sesi döndür
    return this.sounds.get(key) || null;
  }

  // 🔊 Ses çal - ANINDA TETİKLENME (gecikme yok!)
  private async playSound(key: SoundKey, volumeMultiplier: number = 1) {
    if (!this.isEnabled || this.recordingActive) return;

    // Hafif spam kontrolü
    const now = Date.now();
    const lastTime = this.lastPlayTime.get(key) || 0;
    if (now - lastTime < this.minInterval) return;
    this.lastPlayTime.set(key, now);

    try {
      // 🔊 Audio session hazır değilse yenile (60s arası — gereksiz native bridge çağrısı önle)
      if (!this.audioInitialized || (now - this.lastAudioInit > 60000)) {
        await this.refreshAudioSession();
      }
      
      const sound = await this.loadSound(key);
      if (!sound) return;

      // Volume ayarla ve hemen çal
      const finalVolume = VOLUME_LEVELS[key] * volumeMultiplier;
      await sound.setVolumeAsync(finalVolume);
      await sound.setPositionAsync(0);
      await sound.playAsync();
    } catch (e) {
      // Ses çalınamazsa session'ı kesinlikle yenile
      this.audioInitialized = false;
      // Hemen tekrar dene
      try {
        await this.refreshAudioSession();
        const sound = await this.loadSound(key);
        if (sound) {
          const finalVolume = VOLUME_LEVELS[key] * volumeMultiplier;
          await sound.setVolumeAsync(finalVolume);
          await sound.setPositionAsync(0);
          await sound.playAsync();
        }
      } catch (retryError) {
        // İkinci denemede de başarısız oldu, vazgeç
      }
    }
  }

  // ========== PUBLIC API ==========
  
  // 🔊 Ses sistemini ısıt - artık boş, preload yeterli
  async warmup() {
    // Preload zaten sesleri yüklüyor, ekstra bir şey yapmaya gerek yok
    // Eski warmup ses sistemini bozuyordu
    return;
  }
  
  // ✅ Doğru cevap
  playCorrect() { 
    this.playSound('correct'); 
  }
  
  // ❌ Yanlış cevap
  playWrong() { 
    this.playSound('wrong'); 
  }
  
  // 🌾 Hasat - meyve toplama
  playHarvest() { 
    this.playSound('harvest'); 
  }
  
  // 🔥 Combo - streak seviyesine göre (daha hoş sesler)
  playCombo(streak: number = 1) { 
    if (streak >= 5) {
      this.playSound('celebration', 0.8);
      setTimeout(() => this.playSound('ding', 0.5), 150);
    } else if (streak >= 3) {
      this.playSound('celebration', 0.6);
    } else {
      this.playSound('pop', 0.6);
    }
  }
  
  // ⬆️ Level up / Seviye atlama
  playLevelUp() { 
    this.playSound('levelup'); 
  }
  
  // 👑 Master seviye başarısı
  playMaster() { 
    this.playSound('success');
    setTimeout(() => this.playSound('coin', 0.7), 200);
  }
  
  // 👆 Hafif UI tıklaması
  playTap() { 
    this.playSound('tap'); 
  }
  
  // 👉 Swipe / Kaydırma
  playSwipe() {
    this.playSound('swipe');
  }
  
  // 🌱 Dikim / Tarlaya gönderme - GÜÇLÜ SES (hasat ile aynı)
  playPlant() {
    this.playSound('harvest');
    setTimeout(() => this.playSound('success', 0.8), 150);
    setTimeout(() => this.playSound('coin', 0.6), 300);
  }
  
  // 💰 Coin kazanma / harcama
  playCoin() {
    this.playSound('coin');
  }

  // 🫧 Pop sesi - meyve, balon vs.
  playPop() {
    this.playSound('pop');
  }

  // ⭐ Genel başarı sesi
  playSuccess() {
    this.playSound('success');
  }

  // 🎯 Quiz/MiniQuiz açılış - güzel click sesi
  playQuizStart() { 
    this.playSound('click'); 
  }

  // 🖱️ Click sesi - menu, buton vs.
  playClick() {
    this.playSound('click');
  }

  // 🔓 Kilit açma sesi - phrasal unlock
  playUnlock() {
    this.playSound('unlock');
  }

  // 🔔 Tatlı ding sesi - hızlı cevap, cam/zil pit pit
  playDing() {
    this.playSound('ding');
  }
  
  // ⏱️ Timer tick sesi - her saniye (gergin)
  playTick() {
    this.playSound('tick', 0.6);
  }
  
  // 🚨 Alarm sesi - son saniyeler (acil)
  playAlarm() {
    this.playSound('alarm', 0.8);
  }
  
  // 🏁 Quiz bitiş - kutlama
  playQuizEnd() { 
    this.playSound('success'); 
  }
  
  // 🎉 Epik hasat (master seviye)
  playEpicHarvest() { 
    this.playSound('harvest');
    setTimeout(() => this.playSound('success', 0.8), 150);
    setTimeout(() => this.playSound('coin', 0.6), 300);
  }
  
  // ➡️ Sonraki soru geçişi
  playNextQuestion() { 
    this.playSound('swipe', 0.4); 
  }
  
  // 🔥 Streak sesi - tatlı ding pit pit sesi
  playStreak(streak: number) {
    // Tatlı cam/zil ding sesi - pit pit
    this.playDing();
    // 🔊 Combo sesi her zaman çal (1'den itibaren)
    setTimeout(() => this.playCombo(streak), 150);
  }

  // 🎉 Celebration sesi - quiz doğru cevap
  playCelebration() {
    this.playSound('celebration');
  }

  // ❌ Hata / Yanlış cevap
  playError() {
    this.playSound('wrong', 0.7);
  }

  // 💨 Spray - böcek ilacı (pssss)
  playSpray() {
    this.playSound('spray');
  }

  // 💧 Sulama sesi - level up animasyonu için (levelup sesi - güzel kutlama sesi)
  playWatering() {
    // Level up sesi - güzel bir kutlama sesi
    this.playSound('levelup', 0.5);
  }

  // 🐛 Böcek istilası sesi - level down animasyonu için
  playBugInfestation() {
    // Yumuşak pop sesi - rahatsız etmez
    this.playSound('pop', 0.4);
  }

  // �🔧 Ayarlar
  async setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    try {
      await AsyncStorage.setItem('farmword:sounds', enabled ? 'on' : 'off');
    } catch (e) {}
  }

  setRecordingActive(active: boolean) {
    this.recordingActive = !!active;
    if (this.recordingActive) {
      try { Speech.stop(); } catch {}
    }
  }
  
  isAudioEnabled() { 
    return this.isEnabled; 
  }

  // 🗣️ Text-to-Speech — debounced, non-blocking, UI kasması sıfır
  private _isSpeaking = false;
  private _speakDebounce: NodeJS.Timeout | null = null;
  private _lastSpeakTime = 0;

  speakWord(word: string, language: string = 'en-US') {
    if (!this.isEnabled || !word) return;

    // 🔒 Debounce: 150ms içinde tekrar çağrılırsa öncekini iptal et
    if (this._speakDebounce) {
      clearTimeout(this._speakDebounce);
      this._speakDebounce = null;
    }

    const now = Date.now();
    const timeSinceLast = now - this._lastSpeakTime;

    // Çok hızlı ardışık çağrıları engelle — native bridge tıkanmasını önle
    if (timeSinceLast < 200) {
      this._speakDebounce = setTimeout(() => {
        this._speakDebounce = null;
        this._doSpeak(word, language);
      }, 200 - timeSinceLast);
      return;
    }

    this._doSpeak(word, language);
  }

  private _doSpeak(word: string, language: string) {
    this._lastSpeakTime = Date.now();
    try {
      // Her zaman önce durdur — overlap ve _isSpeaking takılmasını önle
      this._isSpeaking = false;
      Speech.stop().catch(() => {});
      // 50ms bekle: Speech.stop() tamamlansın, sonra yeni konuşma başlat
      setTimeout(() => {
        try {
          this._isSpeaking = true;
          Speech.speak(word, {
            language,
            pitch: 1.0,
            rate: 0.9,
            onDone: () => { this._isSpeaking = false; },
            onError: () => { this._isSpeaking = false; },
            onStopped: () => { this._isSpeaking = false; },
          });
        } catch (e) {
          this._isSpeaking = false;
        }
      }, 50);
    } catch (e) {
      this._isSpeaking = false;
    }
  }

  // 🗣️ speakSentence - cümle seslendirme (speakWord ile aynı)
  speakSentence(sentence: string, language: string = 'en-US') {
    this.speakWord(sentence, language);
  }

  stopSpeaking() {
    // 🧹 Pending debounce'u da temizle
    if (this._speakDebounce) {
      clearTimeout(this._speakDebounce);
      this._speakDebounce = null;
    }
    if (this._isSpeaking) {
      this._isSpeaking = false;
      Speech.stop().catch(() => {});
    }
  }

  // 🧹 Cleanup
  async cleanup() {
    for (const sound of this.sounds.values()) {
      try {
        await sound.unloadAsync();
      } catch (e) {}
    }
    this.sounds.clear();
  }
}

// 📳 APPLE-LEVEL HAPTIC SYSTEM
class HapticManager {
  private isEnabled: boolean = true;

  constructor() {
    this.loadSettings();
  }

  private async loadSettings() {
    try {
      const stored = await AsyncStorage.getItem('farmword:haptics');
      if (stored !== null) {
        this.isEnabled = stored !== 'off';
      }
    } catch (e) {}
  }

  // Temel haptic'ler
  light() { if (this.isEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }
  medium() { if (this.isEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }
  heavy() { if (this.isEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }
  soft() { if (this.isEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft); }
  rigid() { if (this.isEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid); }
  success() { if (this.isEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }
  error() { if (this.isEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); }
  warning() { if (this.isEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); }
  selection() { if (this.isEnabled) Haptics.selectionAsync(); }
  tap() { if (this.isEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } // Hafif tap feedback

  // 🎉💥⚡🔥 KUTLAMA - MİNİQUİZ BİTİŞİ! TELEFONU KUDURT!
  celebration() {
    if (!this.isEnabled) return;
    
    // BAŞLANGIÇ PATLAMASI
    this.heavy(); this.rigid(); this.success();
    
    // DALGA 1
    setTimeout(() => { this.heavy(); this.rigid(); }, 30);
    setTimeout(() => { this.success(); this.heavy(); }, 60);
    setTimeout(() => { this.rigid(); this.heavy(); }, 90);
    setTimeout(() => { this.success(); }, 120);
    setTimeout(() => { this.heavy(); this.rigid(); }, 150);
    
    // DALGA 2
    setTimeout(() => { this.success(); this.heavy(); }, 200);
    setTimeout(() => { this.rigid(); this.heavy(); }, 250);
    setTimeout(() => { this.heavy(); this.success(); }, 300);
    setTimeout(() => { this.rigid(); }, 350);
    
    // DALGA 3
    setTimeout(() => { this.heavy(); this.rigid(); this.success(); }, 400);
    setTimeout(() => { this.success(); this.heavy(); }, 450);
    setTimeout(() => { this.rigid(); this.heavy(); }, 500);
    setTimeout(() => { this.heavy(); this.success(); }, 550);
    
    // FİNAL
    setTimeout(() => { this.heavy(); this.rigid(); this.success(); }, 600);
    setTimeout(() => { this.success(); this.heavy(); this.rigid(); }, 700);
    setTimeout(() => { this.heavy(); this.success(); }, 800);
  }

  // 🏆 Master celebration
  masterCelebration() {
    if (!this.isEnabled) return;
    for (let i = 0; i < 5; i++) {
      setTimeout(() => this.heavy(), i * 100);
    }
    setTimeout(() => this.success(), 600);
  }

  // � 25 COMBO - Telefonu titreten ağır haptic (2.5 saniye)
  combo25() {
    if (!this.isEnabled) return;
    this.megaVibration(2);
  }

  // 🔥 50 COMBO - Telefonu titreten ağır haptic (3 saniye)  
  combo50() {
    if (!this.isEnabled) return;
    this.megaVibration(3);
  }

  // 🎯 75 COMBO - 4 saniye ağır haptic
  combo75() {
    if (!this.isEnabled) return;
    this.megaVibration(4);
  }

  // 🔥 100 COMBO - 5 saniye delirtici haptic
  combo100() {
    if (!this.isEnabled) return;
    this.megaVibration(5);
  }

  // 🌟 150 COMBO - 6 saniye delirtici haptic
  combo150() {
    if (!this.isEnabled) return;
    this.megaVibration(6);
  }

  // 💥 200 COMBO - 8 saniye delirtici haptic
  combo200() {
    if (!this.isEnabled) return;
    this.megaVibration(8);
  }
  // 🔥 225 COMBO - 9 saniye delirtici haptic
  combo225() {
    if (!this.isEnabled) return;
    this.megaVibration(9);
  }

  // 💎 250 COMBO - 10 saniye delirtici haptic
  combo250() {
    if (!this.isEnabled) return;
    this.megaVibration(10);
  }

  // ⚡ 275 COMBO - 11 saniye delirtici haptic
  combo275() {
    if (!this.isEnabled) return;
    this.megaVibration(11);
  }

  // 👑 300 COMBO - 12 saniye delirtici haptic
  combo300() {
    if (!this.isEnabled) return;
    this.megaVibration(12);
  }

  // 🌟 MEGA COMBO (300+) - Dinamik süre
  comboMega(durationSeconds: number) {
    if (!this.isEnabled) return;
    this.megaVibration(durationSeconds);
  }
  // �🌋🔥💥 MEGA VİBRASYON - COMBO MİLESTONE'LAR İÇİN TELEFONU PATLAT!
  megaVibration(durationSeconds: number) {
    if (!this.isEnabled) return;
    
    // Interval bazlı yaklaşım - daha az setTimeout, daha performanslı
    const intervalRef = { current: null as any };
    const endTime = Date.now() + (durationSeconds * 1000);
    let tick = 0;
    
    const vibrate = () => {
      if (Date.now() >= endTime) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      
      // Her tick'te ÇOK KUVVETLİ titreşim
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
      
      // Her 2 tick'te bir success ekle
      if (tick % 2 === 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      tick++;
    };
    
    // Hemen başlat
    vibrate();
    // 50ms aralıklarla tekrarla - DAHA HIZLI VE KUVVETLİ
    intervalRef.current = setInterval(vibrate, 50);
  }

  // Quiz açılış
  quizOpen() { this.heavy(); }

  // Option press
  optionPress() {
    this.selection();
    setTimeout(() => this.light(), 40);
  }

  // ⚡⚡⚡ DELİRTİCİ HAPTIC - DOĞRU CEVAP ⚡⚡⚡
  correctAnswer(streak: number) {
    if (!this.isEnabled) return;
    
    if (streak >= 5) {
      // 🔥🔥🔥 5+ COMBO: MEGA DEPREM!
      this.heavy(); this.rigid(); this.success();
      
      setTimeout(() => { this.heavy(); this.rigid(); }, 25);
      setTimeout(() => { this.success(); this.heavy(); }, 50);
      setTimeout(() => { this.rigid(); this.heavy(); }, 75);
      setTimeout(() => { this.heavy(); this.success(); }, 100);
      setTimeout(() => { this.rigid(); this.heavy(); }, 130);
      setTimeout(() => { this.success(); this.heavy(); }, 160);
      
      setTimeout(() => { this.heavy(); this.rigid(); }, 200);
      setTimeout(() => { this.success(); this.heavy(); }, 240);
      setTimeout(() => { this.rigid(); this.heavy(); }, 280);
      setTimeout(() => { this.heavy(); this.success(); }, 320);
      
      setTimeout(() => { this.heavy(); this.rigid(); this.success(); }, 370);
      setTimeout(() => { this.rigid(); this.heavy(); }, 420);
      setTimeout(() => { this.success(); this.heavy(); }, 470);
      setTimeout(() => { this.heavy(); this.rigid(); }, 520);
      setTimeout(() => { this.success(); }, 570);
      
    } else if (streak === 4) {
      // 💥💥 4. COMBO
      this.heavy(); this.rigid(); this.success();
      
      setTimeout(() => { this.heavy(); this.rigid(); }, 40);
      setTimeout(() => { this.success(); this.heavy(); }, 80);
      setTimeout(() => { this.rigid(); this.heavy(); }, 120);
      setTimeout(() => { this.success(); }, 160);
      
      setTimeout(() => { this.heavy(); this.rigid(); }, 210);
      setTimeout(() => { this.success(); this.heavy(); }, 260);
      setTimeout(() => { this.rigid(); }, 310);
      
    } else if (streak === 3) {
      // ⚡ 3. COMBO
      this.heavy(); this.rigid(); this.success();
      
      setTimeout(() => { this.heavy(); this.rigid(); }, 50);
      setTimeout(() => { this.success(); this.heavy(); }, 100);
      setTimeout(() => { this.rigid(); }, 150);
      setTimeout(() => { this.heavy(); this.success(); }, 200);
      
    } else if (streak === 2) {
      // 🔥 2. COMBO
      this.heavy(); this.rigid();
      setTimeout(() => { this.success(); this.heavy(); }, 60);
      setTimeout(() => { this.rigid(); }, 120);
      setTimeout(() => { this.heavy(); }, 180);
      
    } else {
      // ✅ 1. COMBO
      this.heavy(); this.rigid();
      setTimeout(() => { this.success(); }, 50);
      setTimeout(() => { this.heavy(); }, 110);
    }
  }

  // Yanlış cevap
  wrongAnswer() {
    if (!this.isEnabled) return;
    this.error();
    setTimeout(() => this.heavy(), 90);
    setTimeout(() => this.rigid(), 160);
  }

  // Sonraki soru
  nextQuestion() {
    this.light();
    setTimeout(() => this.selection(), 60);
  }

  // Epic hasat
  epicHarvestSuccess() {
    if (!this.isEnabled) return;
    this.success();
    setTimeout(() => this.heavy(), 130);
    setTimeout(() => this.success(), 300);
  }

  // 🌾🌾🌾 HASAT HAPTIK - GÜÇLÜ HASAT HİSSİ! 🌾🌾🌾
  harvestCelebration() {
    if (!this.isEnabled) return;
    
    // BAŞLANGIÇ - Güçlü vuruş
    this.heavy(); this.rigid(); this.success();
    
    // DALGA 1 - Hızlı ritim
    setTimeout(() => { this.heavy(); this.rigid(); }, 50);
    setTimeout(() => { this.success(); this.heavy(); }, 100);
    setTimeout(() => { this.rigid(); this.heavy(); }, 150);
    
    // DALGA 2 - Güçlü vuruşlar
    setTimeout(() => { this.heavy(); this.success(); }, 220);
    setTimeout(() => { this.rigid(); this.heavy(); }, 290);
    setTimeout(() => { this.success(); this.heavy(); }, 360);
    
    // FİNAL - Son güçlü vuruş
    setTimeout(() => { this.heavy(); this.rigid(); this.success(); }, 450);
    setTimeout(() => { this.success(); }, 550);
  }

  progressMilestone() { this.success(); }

  combo(level: number) {
    if (!this.isEnabled) return;
    this.light();
    setTimeout(() => this.light(), 60);
  }

  comboBurst(level: number) {
    if (!this.isEnabled) return;
    if (level >= 50) {
      this.heavy();
      setTimeout(() => this.heavy(), 80);
      setTimeout(() => this.success(), 160);
    } else if (level >= 20) {
      this.medium();
      setTimeout(() => this.heavy(), 70);
    } else if (level >= 10) {
      this.medium();
      setTimeout(() => this.light(), 60);
    } else {
      this.light();
      setTimeout(() => this.light(), 60);
    }
  }

  shake() {
    if (!this.isEnabled) return;
    for (let i = 0; i < 3; i++) {
      setTimeout(() => this.rigid(), i * 80);
    }
  }

  // 🌱🌱🌱 TARLAYA EKME HAPTİK - HASAT KADAR GÜÇLÜ! 🌱🌱🌱
  plantToFarm() {
    if (!this.isEnabled) return;
    
    // BAŞLANGIÇ - Güçlü vuruş (hasat ile aynı)
    this.heavy(); this.rigid(); this.success();
    
    // DALGA 1 - Hızlı ritim
    setTimeout(() => { this.heavy(); this.rigid(); }, 50);
    setTimeout(() => { this.success(); this.heavy(); }, 100);
    setTimeout(() => { this.rigid(); this.heavy(); }, 150);
    
    // DALGA 2 - Güçlü vuruşlar
    setTimeout(() => { this.heavy(); this.success(); }, 220);
    setTimeout(() => { this.rigid(); this.heavy(); }, 290);
    setTimeout(() => { this.success(); this.heavy(); }, 360);
    
    // FİNAL - Son güçlü vuruş
    setTimeout(() => { this.heavy(); this.rigid(); this.success(); }, 450);
    setTimeout(() => { this.success(); }, 550);
  }

  // 💧💧💧 SULAMA HAPTİK - SEVİYE ARTIŞI KUTLAMASI! 💧💧💧
  waterCelebration() {
    if (!this.isEnabled) return;
    
    // 🌊 BAŞLANGIÇ - Yumuşak su akışı hissi
    this.soft(); this.light();
    
    // 💧 DALGA 1 - Damla damla sulama
    setTimeout(() => { this.soft(); }, 80);
    setTimeout(() => { this.light(); this.soft(); }, 160);
    setTimeout(() => { this.soft(); }, 240);
    setTimeout(() => { this.light(); }, 320);
    
    // 🌿 DALGA 2 - Büyüme hissi (güçleniyor)
    setTimeout(() => { this.medium(); this.soft(); }, 400);
    setTimeout(() => { this.soft(); this.light(); }, 480);
    setTimeout(() => { this.medium(); }, 560);
    setTimeout(() => { this.soft(); }, 640);
    
    // ✨ DALGA 3 - Büyüme tamamlandı! (success burst)
    setTimeout(() => { this.success(); this.medium(); }, 720);
    setTimeout(() => { this.soft(); this.light(); }, 800);
    setTimeout(() => { this.medium(); this.success(); }, 880);
    
    // 🌸 FİNAL - Çiçek açma hissi
    setTimeout(() => { this.success(); this.soft(); }, 980);
    setTimeout(() => { this.light(); }, 1060);
    setTimeout(() => { this.success(); }, 1150);
  }

  // 🐛🐛🐛 BÖCEK İSTİLASI HAPTİK - SEVİYE DÜŞÜŞÜ UYARISI! 🐛🐛🐛
  bugInfestation() {
    if (!this.isEnabled) return;
    
    // ⚠️ BAŞLANGIÇ - Tehlike uyarısı
    this.warning(); this.error();
    
    // 🐛 DALGA 1 - Böcek sürünme hissi (hızlı, rahatsız edici)
    setTimeout(() => { this.light(); }, 60);
    setTimeout(() => { this.light(); }, 100);
    setTimeout(() => { this.light(); }, 140);
    setTimeout(() => { this.medium(); }, 180);
    setTimeout(() => { this.light(); }, 220);
    setTimeout(() => { this.light(); }, 260);
    
    // 🦗 DALGA 2 - Daha yoğun sürünme
    setTimeout(() => { this.medium(); this.light(); }, 320);
    setTimeout(() => { this.light(); }, 380);
    setTimeout(() => { this.light(); this.light(); }, 420);
    setTimeout(() => { this.medium(); }, 480);
    setTimeout(() => { this.light(); }, 540);
    
    // 💀 DALGA 3 - Hasar hissi
    setTimeout(() => { this.error(); this.rigid(); }, 620);
    setTimeout(() => { this.heavy(); }, 700);
    setTimeout(() => { this.error(); }, 780);
    
    // 😢 FİNAL - Kayıp hissi
    setTimeout(() => { this.warning(); this.medium(); }, 880);
    setTimeout(() => { this.soft(); }, 980);
  }

  // 🌧️ YAĞMUR/FIRTINA HAPTİK - ALTERNATİF SEVİYE DÜŞÜŞÜ
  stormEffect() {
    if (!this.isEnabled) return;
    
    // ⛈️ Fırtına başlangıcı
    this.heavy(); this.rigid();
    
    // 🌧️ Yağmur damlaları (hızlı, kesik)
    for (let i = 0; i < 8; i++) {
      setTimeout(() => { this.light(); }, 100 + i * 80);
    }
    
    // ⚡ Şimşek
    setTimeout(() => { this.heavy(); this.rigid(); this.error(); }, 750);
    setTimeout(() => { this.heavy(); }, 850);
    
    // 🌪️ Rüzgar etkisi
    setTimeout(() => { this.medium(); this.soft(); }, 950);
    setTimeout(() => { this.soft(); }, 1050);
  }

  async setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    try {
      await AsyncStorage.setItem('farmword:haptics', enabled ? 'on' : 'off');
    } catch (e) {}
  }

  isHapticEnabled() { return this.isEnabled; }
}

// Export singleton instances
export const sound = new SoundManager();
export const haptic = new HapticManager();
