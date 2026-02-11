import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Sprout, ArrowLeft } from 'lucide-react-native';
import { useFarmStore } from '../store/farmStore';
import { haptic, sound } from '../utils/sound';
import { showRewardToast } from '../components/RewardToast';
import JuicyModal from '../components/JuicyModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_SMALL = SCREEN_HEIGHT < 700;

const CUSTOM_WORD_PRICE = 2800;
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
const CEFR_COLORS: Record<string, string> = {
  A1: '#22C55E', A2: '#10B981',
  B1: '#3B82F6', B2: '#6366F1',
  C1: '#A855F7', C2: '#EC4899',
};
const CEFR_LABELS: Record<string, string> = {
  A1: 'Başlangıç', A2: 'Temel',
  B1: 'Orta', B2: 'Orta Üstü',
  C1: 'İleri', C2: 'Uzman',
};

// ═══════════════════════════════════════════════════════════════
// 📝 OLUŞTUR SEKMESI
// ═══════════════════════════════════════════════════════════════
const CreateTab: React.FC<{
  coins: number;
  onWordCreated: () => void;
}> = ({ coins, onWordCreated }) => {
  const [wordText, setWordText] = useState('');
  const [meaningText, setMeaningText] = useState('');
  const [exampleText, setExampleText] = useState('');
  const [selectedCefr, setSelectedCefr] = useState<string>('B1');
  const [isCreating, setIsCreating] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    titleEmoji?: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'purchase';
    buttonText?: string;
  } | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  const addCustomWord = useFarmStore(s => s.addCustomWord);
  const canAfford = coins >= CUSTOM_WORD_PRICE;

  const showGameAlert = useCallback((
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' | 'purchase',
    titleEmoji?: string,
    buttonText?: string,
  ) => {
    setModalConfig({ title, message, type, titleEmoji, buttonText });
    setModalVisible(true);
  }, []);

  useEffect(() => {
    // Pulse animation for create button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleCreate = useCallback(() => {
    if (isCreating) return;
    if (!wordText.trim()) {
      haptic.warning();
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
      return;
    }
    if (!meaningText.trim()) {
      haptic.warning();
      showGameAlert(
        'Eksik Bilgi',
        'Kelimenin Turkce anlamini yazman gerekiyor.',
        'warning',
        '\u26A0\uFE0F',
        'Tamam'
      );
      return;
    }
    if (!canAfford) {
      haptic.error();
      showGameAlert(
        'Yetersiz Coin',
        `Bu islem ${CUSTOM_WORD_PRICE} coin. Su an ${coins} coinin var.`,
        'error',
        '\u{1F4B0}',
        'Tamam'
      );
      return;
    }

    setIsCreating(true);
    haptic.heavy();

    const result = addCustomWord({
      text: wordText.trim(),
      meaning: meaningText.trim(),
      example: exampleText.trim() || undefined,
      difficulty: selectedCefr,
    });

    if (result.success) {
      haptic.plantToFarm();
      sound.playHarvest();

      // Success animation
      Animated.sequence([
        Animated.timing(successAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(1200),
        Animated.timing(successAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();

      showRewardToast('coin', -CUSTOM_WORD_PRICE);

      // Clear form
      setTimeout(() => {
        setWordText('');
        setMeaningText('');
        setExampleText('');
        setIsCreating(false);
        onWordCreated();
      }, 600);

      showGameAlert(
        'Tohum Eklendi',
        result.message,
        'success',
        '\u{1F331}',
        'Harika'
      );
    } else {
      haptic.wrongAnswer();
      sound.playWrong();
      setIsCreating(false);
      showGameAlert(
        'Eklenemedi',
        result.message,
        'error',
        '\u26A0\uFE0F',
        'Tamam'
      );
    }
  }, [wordText, meaningText, exampleText, selectedCefr, canAfford, coins, isCreating, addCustomWord, onWordCreated, showGameAlert]);

  return (
    <>
      <ScrollView
        style={styles.tabContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      {/* 💰 Fiyat Bilgisi */}
      <View style={styles.priceCard}>
        <LinearGradient
          colors={['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0.05)']}
          style={styles.priceGradient}
        >
          <Text style={styles.priceIcon}>💰</Text>
          <View style={styles.priceTextContainer}>
            <Text style={styles.priceLabel}>Kendi Tohum Oluşturma</Text>
            <Text style={styles.priceValue}>{CUSTOM_WORD_PRICE.toLocaleString()} coin</Text>
          </View>
          <View style={[styles.coinBadge, !canAfford && styles.coinBadgeInsufficient]}>
            <Text style={[styles.coinBadgeText, !canAfford && styles.coinBadgeTextInsufficient]}>
              {coins.toLocaleString()}
            </Text>
          </View>
        </LinearGradient>
      </View>

      {/* 📝 Kelime Girişi */}
      <Animated.View style={[styles.inputSection, { transform: [{ translateX: shakeAnim }] }]}>
        <Text style={styles.inputLabel}>🇬🇧 İngilizce Kelime *</Text>
        <TextInput
          style={styles.textInput}
          value={wordText}
          onChangeText={setWordText}
          placeholder="örn: serendipity"
          placeholderTextColor="rgba(255,255,255,0.25)"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={50}
        />
      </Animated.View>

      {/* 📝 Anlam Girişi */}
      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>🇹🇷 Türkçe Anlamı *</Text>
        <TextInput
          style={styles.textInput}
          value={meaningText}
          onChangeText={setMeaningText}
          placeholder="örn: güzel tesadüf, şans"
          placeholderTextColor="rgba(255,255,255,0.25)"
          maxLength={100}
        />
      </View>

      {/* 📝 Örnek Cümle (Opsiyonel) */}
      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>📖 Örnek Cümle (opsiyonel)</Text>
        <TextInput
          style={[styles.textInput, styles.textInputMultiline]}
          value={exampleText}
          onChangeText={setExampleText}
          placeholder="örn: It was pure serendipity that we met."
          placeholderTextColor="rgba(255,255,255,0.25)"
          multiline
          numberOfLines={2}
          maxLength={200}
        />
      </View>

      {/* 📊 CEFR Seviye Seçimi */}
      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>📊 CEFR Seviyesi</Text>
        <View style={styles.cefrGrid}>
          {CEFR_LEVELS.map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.cefrChip,
                selectedCefr === level && {
                  backgroundColor: `${CEFR_COLORS[level]}33`,
                  borderColor: CEFR_COLORS[level],
                },
              ]}
              onPress={() => {
                haptic.selection();
                setSelectedCefr(level);
              }}
            >
              <Text
                style={[
                  styles.cefrChipText,
                  selectedCefr === level && { color: CEFR_COLORS[level] },
                ]}
              >
                {level}
              </Text>
              <Text
                style={[
                  styles.cefrChipLabel,
                  selectedCefr === level && { color: CEFR_COLORS[level], opacity: 1 },
                ]}
              >
                {CEFR_LABELS[level]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 🌱 Oluştur Butonu */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[styles.createButton, !canAfford && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={isCreating || !canAfford}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={canAfford ? ['#22C55E', '#16A34A'] : ['#4B5563', '#374151']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.createButtonGradient}
          >
            <Sprout color="#fff" size={24} strokeWidth={2.5} />
            <Text style={styles.createButtonText}>
              {isCreating ? '⏳ Oluşturuluyor...' : '🌱 Tohum Oluştur'}
            </Text>
            <Text style={styles.createButtonPrice}>
              💰 {CUSTOM_WORD_PRICE.toLocaleString()}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Success overlay */}
      <Animated.View
        pointerEvents="none"
        style={[styles.successOverlay, { opacity: successAnim }]}
      >
        <Text style={styles.successText}>🌱 Tohum Eklendi!</Text>
      </Animated.View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {modalConfig && (
        <JuicyModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title={modalConfig.title}
          titleEmoji={modalConfig.titleEmoji}
          message={modalConfig.message}
          type={modalConfig.type}
          buttons={[
            {
              text: modalConfig.buttonText || 'Tamam',
              type: 'primary',
              onPress: () => setModalVisible(false),
            },
          ]}
        />
      )}
    </>
  );
};

// ═══════════════════════════════════════════════════════════════
// � ANA EKRAN — Sadece kelime oluşturma (eklenen kartlar normal tarlaya gider)
// ═══════════════════════════════════════════════════════════════
const CustomWordCardScreen = () => {
  const navigation = useNavigation<any>();
  const coins = useFarmStore(s => s.coins);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A0A0F', '#0F0F1A', '#0A0A0F']}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              haptic.light();
              navigation.goBack();
            }}
          >
            <ArrowLeft color="#fff" size={22} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>🌱 Kendi Kelime Kartın</Text>
            <Text style={styles.headerSubtitle}>Kelime oluştur, tarlana ek!</Text>
          </View>

          <View style={styles.headerCoinPill}>
            <Text style={styles.headerCoinIcon}>💰</Text>
            <Text style={styles.headerCoinText}>
              {coins >= 10000 ? `${(coins / 1000).toFixed(0)}k` : coins.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Content — Sadece CreateTab */}
        <KeyboardAvoidingView
          style={styles.contentContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={100}
        >
          <CreateTab
            coins={coins}
            onWordCreated={() => {
              // Kelime normal tarlaya eklendi
            }}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════
// 🎨 STİLLER
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  safeArea: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  headerCoinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
    gap: 4,
  },
  headerCoinIcon: {
    fontSize: 14,
  },
  headerCoinText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFD700',
  },

  // Content
  contentContainer: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Price Card
  priceCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  priceGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  priceIcon: {
    fontSize: 28,
  },
  priceTextContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFD700',
    marginTop: 2,
  },
  coinBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  coinBadgeInsufficient: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  coinBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#86EFAC',
  },
  coinBadgeTextInsufficient: {
    color: '#FCA5A5',
  },

  // Input Sections
  inputSection: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  textInputMultiline: {
    height: 70,
    textAlignVertical: 'top',
    paddingTop: 14,
  },

  // CEFR Grid
  cefrGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cefrChip: {
    width: (SCREEN_WIDTH - 64) / 3,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  cefrChipText: {
    fontSize: 16,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
  },
  cefrChipLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
    opacity: 0.7,
  },

  // Create Button
  createButton: {
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  createButtonDisabled: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  createButtonPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },

  // Success Overlay
  successOverlay: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.95)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 20,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
  },
  successText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
});

export default CustomWordCardScreen;
