import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
  Modal,
  Easing,
  Alert,
  Switch,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { 
  User, 
  Award, 
  TrendingUp, 
  Zap, 
  Target,
  Calendar,
  Trophy,
  Star,
  Flame,
  BookOpen,
  CheckCircle,
  XCircle,
  Crown,
  Sparkles,
  Package,
  Sprout,
  Heart,
  Volume2,
  VolumeX,
  RotateCcw,
  Settings,
  ChevronRight,
  FileText,
  Shield,
  Gauge,
  ArrowLeft,
} from 'lucide-react-native';
import { useFarmStore } from '../store/farmStore';
import { usePerformanceStore, PERFORMANCE_LABELS, type PerformanceLevel } from '../store/performanceStore';
import { haptic, sound } from '../utils/sound';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isSmallScreen = SCREEN_HEIGHT < 700;

// 🎨 Premium Apple-inspired Colors
const COLORS = {
  background: '#000000',
  backgroundAlt: '#0a0a0a',
  surface: 'rgba(28, 28, 30, 0.95)',
  surfaceLight: 'rgba(44, 44, 46, 0.8)',
  accent: '#30D158', // Apple green
  gold: '#FFD60A',
  purple: '#BF5AF2',
  blue: '#0A84FF',
  pink: '#FF375F',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  textTertiary: '#636366',
  border: 'rgba(255, 255, 255, 0.1)',
};

// 💎 Profile Avatar Component - Apple-smooth Animated
const ProfileAvatar = ({ level, xp }: { level: number; xp: number }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Subtle pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const xpInLevel = xp % 1000;
  const progress = (xpInLevel / 1000) * 100;

  return (
    <View style={styles.avatarContainer}>
      {/* Glow effect */}
      <Animated.View style={[styles.avatarGlow, { opacity: glowAnim }]} />

      {/* Avatar circle */}
      <Animated.View style={[styles.avatarCircle, { transform: [{ scale: pulseAnim }] }]}>
        <LinearGradient
          colors={['#BF5AF2', '#8B5CF6', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarGradient}
        >
          <Text style={styles.avatarEmoji}>👤</Text>
        </LinearGradient>
      </Animated.View>

      {/* Level badge - Apple style */}
      <View style={styles.levelBadge}>
        <LinearGradient
          colors={['#FFD60A', '#FF9F0A']}
          style={styles.levelBadgeGradient}
        >
          <Crown size={12} color="#000" strokeWidth={3} />
          <Text style={styles.levelText}>{level}</Text>
        </LinearGradient>
      </View>
    </View>
  );
};

// 📊 Stat Card Component - Apple Glass Morphism
const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  color, 
  index 
}: { 
  icon: any; 
  label: string; 
  value: string | number; 
  color: string; 
  index: number;
}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = index * 60;
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay,
        friction: 10,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        delay,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  return (
    <Animated.View 
      style={[
        styles.statCard, 
        { 
          opacity: fadeAnim, 
          transform: [{ scale: scaleAnim }] 
        }
      ]}
    >
      <View style={styles.statCardInner}>
        <View style={[styles.statIconContainer, { backgroundColor: `${color}20` }]}>
          <Icon size={20} color={color} strokeWidth={2.5} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </Animated.View>
  );
};

// 🏆 Achievement Badge Component
const AchievementBadge = ({ 
  icon, 
  title, 
  unlocked, 
  index 
}: { 
  icon: string; 
  title: string; 
  unlocked: boolean; 
  index: number;
}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = index * 60;
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        delay,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  return (
    <Animated.View 
      style={[
        styles.achievementBadge, 
        !unlocked && styles.achievementLocked,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
      ]}
    >
      <Text style={[styles.achievementIcon, !unlocked && styles.achievementIconLocked]}>
        {icon}
      </Text>
      <Text style={[styles.achievementTitle, !unlocked && styles.achievementTitleLocked]} numberOfLines={2}>
        {title}
      </Text>
    </Animated.View>
  );
};

// 🏠 Main Profile Screen - Apple-smooth Premium
export default function ProfileScreen() {
  const navigation = useNavigation();
  const { 
    level, 
    xp, 
    coins, 
    streak, 
    bestStreak,
    currentCombo,
    farm,
    inventory,
    totalCorrect,
    totalWrong,
    phrasalVerbFarm,
    achievements,
    nickname,
    sfxEnabled,
    setSfx,
    hapticEnabled,
    setHaptic,
    resetProgress,
    resetTutorial,
  } = useFarmStore();
  
  // 🎮 Performans ayarları
  const { level: performanceLevel, setLevel: setPerformanceLevel } = usePerformanceStore();
  
  const [showSettings, setShowSettings] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);

  // Calculate stats
  const totalWords = farm.length;
  const inventoryWords = inventory.length;
  const phrasalVerbs = phrasalVerbFarm.length;
  const totalQuestions = totalCorrect + totalWrong;
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  // Hasat hazır: wrongCount >= 2 ve masterLevel === 0 VEYA masterLevel > 0
  const harvestReady = farm.filter(w => ((w.wrongCount || 0) >= 2 && (w.masterLevel || 0) === 0) || (w.masterLevel || 0) > 0).length;
  // Toplam puan: coins + xp
  const totalScore = coins + xp;

  // XP progress
  const xpInLevel = xp % 1000;

  // Store'dan gelen başarımları kullan
  const achievementList = achievements || [];

  return (
    <View style={styles.container}>
      {/* Pure black background */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />

      {/* 🔙 GERİ BUTONU - Sol üst köşe */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          haptic.light();
          navigation.goBack();
        }}
        activeOpacity={0.7}
      >
        <View style={styles.backButtonInner}>
          <ArrowLeft size={22} color="#fff" />
          <Text style={styles.backButtonText}>Geri</Text>
        </View>
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Spacer */}
        <View style={styles.headerSpacer} />

        {/* 🍎 Profile Header - Apple Style */}
        <View style={styles.profileHeader}>
          <ProfileAvatar level={level} xp={xp} />
          
          <Text style={styles.userName}>{nickname || 'Oyuncu'}</Text>
          <View style={styles.userTitleBadge}>
            <Sparkles size={14} color="#FFD60A" />
            <Text style={styles.userTitle}>Word Master</Text>
          </View>

          {/* XP Progress Bar - Apple Style */}
          <View style={styles.xpBarContainer}>
            <View style={styles.xpBarInfo}>
              <Text style={styles.xpBarLabel}>Level {level}</Text>
              <Text style={styles.xpBarValue}>{xpInLevel}/1000 XP</Text>
            </View>
            <View style={styles.xpBarBg}>
              <View style={[styles.xpBarFill, { width: `${(xpInLevel / 1000) * 100}%` }]} />
            </View>
          </View>

          {/* Coins Badge */}
          <View style={styles.coinsBadge}>
            <Text style={styles.coinsIcon}>💰</Text>
            <Text style={styles.coinsText}>{coins.toLocaleString()}</Text>
          </View>
        </View>

        {/* 📊 Stats Grid - Apple Glass Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İstatistikler</Text>
          <View style={styles.statsGrid}>
            <StatCard icon={TrendingUp} label="Seviye" value={level} color={COLORS.accent} index={0} />
            <StatCard icon={Zap} label="En Yüksek Combo" value={`${bestStreak}🔥`} color="#FF9F0A" index={1} />
            <StatCard icon={Trophy} label="Puan" value={totalScore.toLocaleString()} color={COLORS.gold} index={2} />
            <StatCard icon={Target} label="Başarı" value={`${accuracy}%`} color={COLORS.purple} index={3} />
            <StatCard icon={CheckCircle} label="Doğru" value={totalCorrect} color={COLORS.accent} index={4} />
            <StatCard icon={XCircle} label="Yanlış" value={totalWrong} color={COLORS.pink} index={5} />
            <StatCard icon={Sprout} label="Tarla" value={totalWords} color={COLORS.blue} index={6} />
            <StatCard icon={Package} label="Envanter" value={inventoryWords} color={COLORS.purple} index={7} />
          </View>
        </View>

        {/* 🏅 Records - Apple Style Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rekorlar</Text>
          <View style={styles.recordsContainer}>
            <View style={styles.recordCard}>
              <View style={[styles.recordIconWrap, { backgroundColor: 'rgba(255, 159, 10, 0.15)' }]}>
                <Flame size={22} color="#FF9F0A" strokeWidth={2.5} />
              </View>
              <View style={styles.recordInfo}>
                <Text style={styles.recordLabel}>En Yüksek Combo</Text>
                <Text style={styles.recordValue}>{bestStreak}x 🔥</Text>
              </View>
            </View>
            <View style={styles.recordCard}>
              <View style={[styles.recordIconWrap, { backgroundColor: 'rgba(255, 214, 10, 0.15)' }]}>
                <Star size={22} color="#FFD60A" strokeWidth={2.5} />
              </View>
              <View style={styles.recordInfo}>
                <Text style={styles.recordLabel}>Toplam XP</Text>
                <Text style={styles.recordValue}>{xp.toLocaleString()}</Text>
              </View>
            </View>
            <View style={styles.recordCard}>
              <View style={[styles.recordIconWrap, { backgroundColor: 'rgba(48, 209, 88, 0.15)' }]}>
                <Crown size={22} color="#30D158" strokeWidth={2.5} />
              </View>
              <View style={styles.recordInfo}>
                <Text style={styles.recordLabel}>Hasat Hazır</Text>
                <Text style={styles.recordValue}>{harvestReady} kelime 🌾</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 🏆 Achievements - Apple Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Başarılar</Text>
          <View style={styles.achievementsGrid}>
            {achievementList.length > 0 ? achievementList.map((achievement: any, index: number) => (
              <AchievementBadge
                key={achievement.id || index}
                icon={achievement.icon || '🏆'}
                title={achievement.title || achievement.name || 'Başarı'}
                unlocked={achievement.unlocked || false}
                index={index}
              />
            )) : (
              <View style={{ flex: 1, alignItems: 'center', paddingVertical: 20 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Henüz başarım yok</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* ⚙️ Ayarlar Bölümü */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ayarlar</Text>
          
          {/* Ses Ayarı */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconWrap, { backgroundColor: 'rgba(10, 132, 255, 0.15)' }]}>
                {sfxEnabled ? (
                  <Volume2 size={20} color="#0A84FF" strokeWidth={2.5} />
                ) : (
                  <VolumeX size={20} color="#8E8E93" strokeWidth={2.5} />
                )}
              </View>
              <Text style={styles.settingLabel}>Ses Efektleri</Text>
            </View>
            <Switch
              value={sfxEnabled}
              onValueChange={(value) => {
                haptic.light();
                setSfx(value);
                sound.setEnabled(value);
              }}
              trackColor={{ false: '#39393D', true: '#30D158' }}
              thumbColor="#fff"
            />
          </View>
          
          {/* Haptic Ayarı */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconWrap, { backgroundColor: 'rgba(255, 159, 10, 0.15)' }]}>
                <Zap size={20} color={hapticEnabled ? "#FF9F0A" : "#8E8E93"} strokeWidth={2.5} />
              </View>
              <Text style={styles.settingLabel}>Titreşim</Text>
            </View>
            <Switch
              value={hapticEnabled}
              onValueChange={(value) => {
                if (value) haptic.light();
                setHaptic(value);
                haptic.setEnabled(value);
              }}
              trackColor={{ false: '#39393D', true: '#30D158' }}
              thumbColor="#fff"
            />
          </View>
          
          {/* 🎮 Performans Ayarı */}
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => {
              haptic.light();
              setShowPerformanceModal(true);
            }}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconWrap, { backgroundColor: 'rgba(191, 90, 242, 0.15)' }]}>
                <Gauge size={20} color="#BF5AF2" strokeWidth={2.5} />
              </View>
              <Text style={styles.settingLabel}>Grafik Kalitesi</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: '#BF5AF2', fontSize: 13, fontWeight: '600' }}>
                {PERFORMANCE_LABELS[performanceLevel].emoji} {PERFORMANCE_LABELS[performanceLevel].name}
              </Text>
              <ChevronRight size={18} color="#636366" />
            </View>
          </TouchableOpacity>
          
          {/* İlerlemeyi Sıfırla */}
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => {
              haptic.medium();
              Alert.alert(
                '⚠️ İlerlemeyi Sıfırla',
                'Tüm ilerlemeniz silinecek. Bu işlem geri alınamaz!',
                [
                  { text: 'İptal', style: 'cancel' },
                  { 
                    text: 'Sıfırla', 
                    style: 'destructive',
                    onPress: () => {
                      resetProgress();
                      haptic.heavy();
                    }
                  },
                ]
              );
            }}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconWrap, { backgroundColor: 'rgba(255, 55, 95, 0.15)' }]}>
                <RotateCcw size={20} color="#FF375F" strokeWidth={2.5} />
              </View>
              <Text style={[styles.settingLabel, { color: '#FF375F' }]}>İlerlemeyi Sıfırla</Text>
            </View>
            <ChevronRight size={20} color="#636366" />
          </TouchableOpacity>
        </View>

        {/* 📜 Yasal Bilgiler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yasal</Text>
          
          {/* Gizlilik Politikası */}
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => {
              haptic.light();
              Linking.openURL('https://enisatakancagirici.github.io/Enis-Atakan-Cagirici-FarmEnglish/privacy.html');
            }}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconWrap, { backgroundColor: 'rgba(10, 132, 255, 0.15)' }]}>
                <Shield size={20} color="#0A84FF" strokeWidth={2.5} />
              </View>
              <Text style={styles.settingLabel}>Gizlilik Politikası</Text>
            </View>
            <ChevronRight size={20} color="#636366" />
          </TouchableOpacity>
          
          {/* KVKK Aydınlatma Metni */}
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => {
              haptic.light();
              Linking.openURL('https://enisatakancagirici.github.io/Enis-Atakan-Cagirici-FarmEnglish/kvkk.html');
            }}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconWrap, { backgroundColor: 'rgba(191, 90, 242, 0.15)' }]}>
                <FileText size={20} color="#BF5AF2" strokeWidth={2.5} />
              </View>
              <Text style={styles.settingLabel}>KVKK Aydınlatma Metni</Text>
            </View>
            <ChevronRight size={20} color="#636366" />
          </TouchableOpacity>
          
          {/* Kullanım Koşulları */}
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => {
              haptic.light();
              Linking.openURL('https://enisatakancagirici.github.io/Enis-Atakan-Cagirici-FarmEnglish/terms.html');
            }}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconWrap, { backgroundColor: 'rgba(255, 159, 10, 0.15)' }]}>
                <FileText size={20} color="#FF9F0A" strokeWidth={2.5} />
              </View>
              <Text style={styles.settingLabel}>Kullanım Koşulları</Text>
            </View>
            <ChevronRight size={20} color="#636366" />
          </TouchableOpacity>
          
          {/* Geliştirici Sayfası */}
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => {
              haptic.light();
              Linking.openURL('https://enisatakancagirici.github.io/Enis-Atakan-Cagirici-FarmEnglish/');
            }}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconWrap, { backgroundColor: 'rgba(48, 209, 88, 0.15)' }]}>
                <User size={20} color="#30D158" strokeWidth={2.5} />
              </View>
              <Text style={styles.settingLabel}>Geliştirici Sayfası</Text>
            </View>
            <ChevronRight size={20} color="#636366" />
          </TouchableOpacity>

          {/* Uygulama Versiyonu */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconWrap, { backgroundColor: 'rgba(142, 142, 147, 0.15)' }]}>
                <Settings size={20} color="#8E8E93" strokeWidth={2.5} />
              </View>
              <Text style={styles.settingLabel}>Versiyon</Text>
            </View>
            <Text style={{ color: '#8E8E93', fontSize: 15 }}>1.0.2</Text>
          </View>
        </View>

        {/* Bottom Spacer for Tab Bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
      
      {/* 🎮 Performance Settings Modal */}
      <Modal
        visible={showPerformanceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPerformanceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.performanceModal}>
            <View style={styles.performanceModalHeader}>
              <Text style={styles.performanceModalTitle}>🎮 Grafik Kalitesi</Text>
              <TouchableOpacity 
                onPress={() => setShowPerformanceModal(false)}
                style={styles.performanceModalClose}
              >
                <Text style={styles.performanceModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.performanceModalSubtitle}>
              Cihazınıza uygun performans ayarını seçin
            </Text>
            
            <View style={styles.performanceLevelList}>
              {(['LOW', 'MEDIUM', 'HIGH', 'ULTRA', 'PERFECT'] as PerformanceLevel[]).map((level) => {
                const info = PERFORMANCE_LABELS[level];
                const isSelected = performanceLevel === level;
                
                return (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.performanceLevelItem,
                      isSelected && styles.performanceLevelItemSelected,
                    ]}
                    onPress={() => {
                      haptic.medium();
                      setPerformanceLevel(level, true); // true = manuel ayar
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.performanceLevelEmoji}>{info.emoji}</Text>
                    <View style={styles.performanceLevelInfo}>
                      <Text style={[
                        styles.performanceLevelName,
                        isSelected && styles.performanceLevelNameSelected,
                      ]}>
                        {info.name}
                      </Text>
                      <Text style={styles.performanceLevelDesc}>
                        {info.description}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={styles.performanceLevelCheck}>
                        <Text style={styles.performanceLevelCheckText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <View style={styles.performanceModalTip}>
              <Text style={styles.performanceModalTipText}>
                💡 Düşük seviyeler eski cihazlarda daha akıcı çalışır. Yüksek seviyeler daha fazla görsel efekt sunar.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  // 🔙 GERİ BUTONU
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 16,
    zIndex: 100,
  },
  backButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerSpacer: {
    height: Platform.OS === 'ios' ? 50 : 30,
  },
  
  // 🍎 Profile Header - Apple Style
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#BF5AF2',
    opacity: 0.3,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 48,
  },
  levelBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#000',
  },
  levelBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 3,
  },
  levelText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000',
  },
  userName: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  userTitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 214, 10, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 20,
  },
  userTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFD60A',
  },
  xpBarContainer: {
    width: '100%',
    maxWidth: 280,
    marginBottom: 16,
  },
  xpBarInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  xpBarLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  xpBarValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accent,
  },
  xpBarBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 4,
  },
  coinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 214, 10, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 10, 0.2)',
  },
  coinsIcon: {
    fontSize: 18,
  },
  coinsText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFD60A',
  },

  // Section
  section: {
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 14,
    letterSpacing: 0.3,
  },

  // 📊 Stats Grid - Apple Glass
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: (SCREEN_WIDTH - 52) / 2,
  },
  statCardInner: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  // 🏅 Records - Apple Cards
  recordsContainer: {
    gap: 10,
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  recordIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordInfo: {
    flex: 1,
  },
  recordLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 3,
    fontWeight: '600',
  },
  recordValue: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },

  // 🏆 Achievements - Apple Badges
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  achievementBadge: {
    width: (SCREEN_WIDTH - 62) / 4,
    aspectRatio: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },
  achievementLocked: {
    borderColor: COLORS.border,
    opacity: 0.4,
  },
  achievementIcon: {
    fontSize: 26,
    marginBottom: 4,
  },
  achievementIconLocked: {
    opacity: 0.3,
  },
  achievementTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  achievementTitleLocked: {
    color: COLORS.textTertiary,
  },
  
  // ⚙️ Settings
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },

  bottomSpacer: {
    height: 40,
  },
  
  // 🎮 Performance Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  performanceModal: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  performanceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  performanceModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  performanceModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  performanceModalCloseText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '600',
  },
  performanceModalSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 20,
  },
  performanceLevelList: {
    gap: 10,
  },
  performanceLevelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  performanceLevelItemSelected: {
    borderColor: '#BF5AF2',
    backgroundColor: 'rgba(191, 90, 242, 0.15)',
  },
  performanceLevelEmoji: {
    fontSize: 28,
    marginRight: 14,
  },
  performanceLevelInfo: {
    flex: 1,
  },
  performanceLevelName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  performanceLevelNameSelected: {
    color: '#BF5AF2',
  },
  performanceLevelDesc: {
    fontSize: 12,
    color: '#8E8E93',
  },
  performanceLevelCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#BF5AF2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  performanceLevelCheckText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  performanceModalTip: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 214, 10, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 10, 0.2)',
  },
  performanceModalTipText: {
    fontSize: 12,
    color: '#FFD60A',
    textAlign: 'center',
    lineHeight: 18,
  },
});
