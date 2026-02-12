/**
 *  SesYap Ekranı - Yapboz Tarzı Konuşma Modu
 *
 * Kelimeler boşluk olarak gösterilir, doğru söylenenler yerine oturur.
 * Yapboz MiniQuiz'e çok benzer UI.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Pressable,
    Animated,
    Dimensions,
    Platform,
    ActivityIndicator,
    Linking,
    ScrollView,
    Easing,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Mic,
    MicOff,
    ChevronLeft,
    RotateCcw,
    Check,
    X,
    Star,
    SkipForward,
    Sparkles,
    Volume2,
    BookOpen,
    Wheat,
    Apple,
    Sprout,
} from 'lucide-react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';

import { haptic, sound } from '../utils/sound';
import {
    startRecording,
    stopRecording,
    transcribeAudio,
    deleteRecording,
    getRecordingStatus,
    getMicrophonePermissionState,
    requestMicrophonePermission,
} from '../utils/speechToText';
import { compareSentences, ComparisonResult } from '../utils/compareSentences';
import { normalizeDisplayText } from '../utils/textNormalization';
import { useFarmStore } from '../store/farmStore';
import JuicyModal from '../components/JuicyModal';
import {
    BORDER_STYLES,
    DEFAULT_CUSTOMIZATION,
    getThemeOverlay,
    type CardFontStyle,
} from '../data/cardThemes';
import NetInfo from '@react-native-community/netinfo';
import { traceEvent } from '../utils/debugTrace';

// Örnek cümleler veri kaynağı
import ensaglamData from '../../assets/data/ensaglamdata_with_example_tr.json';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_SMALL_DEVICE = SCREEN_HEIGHT < 700;

// Mod tipleri
type SesYapMode = 'calis' | 'tarla';
type MicModalState = 'hidden' | 'needPermission' | 'settingsRequired' | 'startFailed';

// Çalışılmış cümle geçmişi için tip
interface SentenceHistory {
    sentence: SentenceData;
    correct: boolean;
    timestamp: number;
}

// Kayıt ayarları - Hızlı sonuç için optimize edildi
const RECORDING_DURATION_MS = 6000;
const SILENCE_THRESHOLD = -35;
const SILENCE_DURATION_MS = 800; // 1500 → 800ms - Anında sonuç
const MIN_SPEECH_TIME_MS = 600; // 800 → 600ms - Daha hızlı algılama

// 🌈 Renk paleti - Yapboz ile uyumlu
const COLORS = {
    background: '#0F172A',
    surface: 'rgba(30, 41, 59, 0.95)',
    accent: '#8B5CF6',
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F59E0B',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    border: 'rgba(148, 163, 184, 0.3)',
    glow: '#A855F7',
};

const getCardSizeMultiplier = (compactMode: boolean, largeMode: boolean): number => {
    if (largeMode) return 1.16;
    if (compactMode) return 0.82;
    return 1;
};

const getFontStyle = (fontStyle: CardFontStyle) => {
    if (fontStyle === 'serif') return { fontFamily: 'serif' as const, letterSpacing: 0 };
    if (fontStyle === 'mono') {
        return {
            fontFamily: Platform.OS === 'ios' ? ('Menlo' as const) : ('monospace' as const),
            letterSpacing: 0,
        };
    }
    if (fontStyle === 'rounded') return { letterSpacing: 0.3 };
    return {};
};

// Veri tipleri
interface WordItem {
    word: string;
    cefr: string;
    tr: string;
    example: string;
    example_tr: string;
}

interface EnsaglamDataType {
    items: WordItem[];
}

interface SentenceData {
    wordId?: string;
    word: string;
    meaning_tr: string;
    example_en: string;
    example_tr: string;
}

//  Rastgele örnek cümle seç (performans için önceden filtrelenmiş)
const ENSAGLAM_DATA = ensaglamData as EnsaglamDataType;
const VALID_SENTENCES: WordItem[] = (ENSAGLAM_DATA.items || []).filter(item => {
    if (!item.example || item.example.length < 10) return false;
    const wordCount = item.example.split(' ').length;
    return wordCount <= 10 && wordCount >= 3;
});

function getRandomSentence(): SentenceData | null {
    if (VALID_SENTENCES.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * VALID_SENTENCES.length);
    const item = VALID_SENTENCES[randomIndex];

    return {
        word: normalizeDisplayText(item.word),
        meaning_tr: normalizeDisplayText(item.tr),
        example_en: normalizeDisplayText(item.example),
        example_tr: normalizeDisplayText(item.example_tr),
    };
}

function normalizeMatchKey(value: unknown): string {
    return normalizeDisplayText(value).trim().toLowerCase();
}

function toSentenceData(source: any, fallbackWordId?: string): SentenceData | null {
    if (!source || typeof source !== 'object') return null;
    const word = normalizeDisplayText(source.word ?? source.text ?? source.verb);
    const meaning = normalizeDisplayText(source.meaning_tr ?? source.meaning ?? source.tr);
    const exampleEn = normalizeDisplayText(source.example_en ?? source.example);
    const exampleTr = normalizeDisplayText(source.example_tr ?? source.tr ?? source.meaning);
    if (!word || !exampleEn) return null;
    const wordId = typeof source.wordId === 'string'
        ? source.wordId
        : typeof source.id === 'string'
            ? source.id
            : fallbackWordId;
    return {
        wordId: typeof wordId === 'string' && wordId.trim().length > 0 ? wordId.trim() : undefined,
        word,
        meaning_tr: meaning,
        example_en: exampleEn,
        example_tr: exampleTr,
    };
}

// 🧩 Kelime Slot'u - Her zaman İngilizce kelimeyi göster
interface WordSlotProps {
    word: string;
    status: 'pending' | 'correct' | 'wrong';
    index: number;
}

const WordSlot = memo<WordSlotProps>(({ word, status, index }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (status !== 'pending') {
            // Pop animasyonu
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 1.15,
                    duration: 120,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 4,
                    useNativeDriver: true,
                }),
            ]).start();

            // Glow (sadece doğruysa)
            if (status === 'correct') {
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(glowAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
                        Animated.timing(glowAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
                    ])
                ).start();
            }
        }
    }, [status]);

    const getBgColor = () => {
        if (status === 'correct') return 'rgba(34, 197, 94, 0.25)';
        if (status === 'wrong') return 'rgba(239, 68, 68, 0.25)';
        return 'rgba(139, 92, 246, 0.1)';
    };

    const getBorderColor = () => {
        if (status === 'correct') return COLORS.success;
        if (status === 'wrong') return COLORS.error;
        return 'rgba(139, 92, 246, 0.3)';
    };

    const getTextColor = () => {
        if (status === 'correct') return COLORS.success;
        if (status === 'wrong') return COLORS.error;
        return COLORS.text; // Pending için normal beyaz renk - kelime görünsün!
    };

    return (
        <Animated.View
            style={[
                styles.wordSlot,
                {
                    backgroundColor: getBgColor(),
                    borderColor: getBorderColor(),
                    transform: [{ scale: scaleAnim }],
                    shadowColor: status === 'correct' ? COLORS.success : COLORS.accent,
                    shadowOpacity: status === 'correct' ? 0.4 : 0,
                },
            ]}
        >
            <View style={styles.slotContent}>
                <Text style={[styles.wordSlotText, { color: getTextColor() }]}>{word}</Text>
                {status === 'correct' && (
                    <Check size={14} color={COLORS.success} strokeWidth={3} style={styles.slotIcon} />
                )}
                {status === 'wrong' && (
                    <X size={14} color={COLORS.error} strokeWidth={3} style={styles.slotIcon} />
                )}
            </View>
        </Animated.View>
    );
});
WordSlot.displayName = 'WordSlot';

//  Mikrofon Butonu
interface MicButtonProps {
    isRecording: boolean;
    isProcessing: boolean;
    remainingTime: number;
    onPress: () => void;
}

const MicButton = memo<MicButtonProps>(({ isRecording, isProcessing, remainingTime, onPress }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const ringAnim = useRef(new Animated.Value(0)).current;
    const pressScale = useRef(new Animated.Value(1)).current;
    const pressGlow = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isRecording) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.1, duration: 500, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                ])
            ).start();

            Animated.loop(
                Animated.timing(ringAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
            ).start();
        } else {
            pulseAnim.setValue(1);
            ringAnim.setValue(0);
        }

        return () => {
            pulseAnim.stopAnimation();
            ringAnim.stopAnimation();
        };
    }, [isRecording]);

    const ringScale = ringAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 2],
    });

    const ringOpacity = ringAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.5, 0.2, 0],
    });

    const glowScale = pressGlow.interpolate({
        inputRange: [0, 1],
        outputRange: [0.9, 1.1],
    });

    const handlePressIn = () => {
        if (!isProcessing) {
            sound.playTap();
        }
        Animated.parallel([
            Animated.spring(pressScale, {
                toValue: 0.94,
                speed: 30,
                bounciness: 10,
                useNativeDriver: true,
            }),
            Animated.timing(pressGlow, {
                toValue: 1,
                duration: 120,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handlePressOut = () => {
        Animated.parallel([
            Animated.sequence([
                Animated.spring(pressScale, {
                    toValue: 1.04,
                    speed: 26,
                    bounciness: 10,
                    useNativeDriver: true,
                }),
                Animated.spring(pressScale, {
                    toValue: 1,
                    speed: 20,
                    bounciness: 8,
                    useNativeDriver: true,
                }),
            ]),
            Animated.timing(pressGlow, {
                toValue: 0,
                duration: 220,
                useNativeDriver: true,
            }),
        ]).start();
    };

    return (
        <View style={styles.micContainer}>
            {/* Ring efekti */}
            {isRecording && (
                <Animated.View
                    style={[
                        styles.micRing,
                        { transform: [{ scale: ringScale }], opacity: ringOpacity },
                    ]}
                />
            )}

            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={isProcessing}
            >
                <Animated.View style={[styles.micButtonWrapper, { transform: [{ scale: pressScale }] }]}>
                    <Animated.View
                        style={[
                            styles.micButtonGlow,
                            {
                                opacity: pressGlow,
                                transform: [{ scale: glowScale }],
                                backgroundColor: isRecording ? 'rgba(239, 68, 68, 0.35)' : 'rgba(139, 92, 246, 0.35)',
                                shadowColor: isRecording ? '#EF4444' : '#8B5CF6',
                            },
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.micButton,
                            isRecording && styles.micButtonRecording,
                            { transform: [{ scale: pulseAnim }] },
                        ]}
                    >
                        <LinearGradient
                            colors={isRecording ? ['#EF4444', '#DC2626'] : ['#8B5CF6', '#7C3AED']}
                            style={styles.micButtonGradient}
                        >
                            {isProcessing ? (
                                <ActivityIndicator size="large" color="#FFFFFF" />
                            ) : isRecording ? (
                                <MicOff size={36} color="#FFFFFF" strokeWidth={2} />
                            ) : (
                                <Mic size={36} color="#FFFFFF" strokeWidth={2} />
                            )}
                        </LinearGradient>
                    </Animated.View>
                </Animated.View>
            </Pressable>

            <Text style={styles.micHint}>
                {isProcessing
                    ? 'Kontrol ediliyor...'
                    : isRecording
                        ? (remainingTime + 's')
                        : 'Konuş'}
            </Text>
        </View>
    );
});
MicButton.displayName = 'MicButton';

//  Cümle Seslendirme Butonu
interface SpeakButtonProps {
    sentence: SentenceData | null;
    disabled?: boolean;
    onPress?: () => void;
}

const SpeakButton = memo<SpeakButtonProps>(({ sentence, disabled = false, onPress }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!disabled) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.05,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ]),
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [disabled]);

    return (
        <View style={styles.speakButtonContainer}>
            <Pressable onPress={onPress} disabled={disabled || !sentence}>
                <View style={styles.micButtonWrapper}>
                    <Animated.View
                        style={[
                            styles.speakButton,
                            { transform: [{ scale: pulseAnim }] },
                        ]}
                    >
                        <LinearGradient
                            colors={disabled ? ['#94A3B8', '#64748B'] : ['#3B82F6', '#2563EB']}
                            style={styles.speakButtonGradient}
                        >
                            <Volume2 size={32} color="#FFFFFF" strokeWidth={2} />
                        </LinearGradient>
                    </Animated.View>
                </View>
            </Pressable>

            <Text style={styles.speakHint}>Seslendir</Text>
        </View>
    );
});
SpeakButton.displayName = 'SpeakButton';

// 📱 Ana Ekran
export default function SesYapScreen() {
    const navigation = useNavigation();

    // 📦 Store'dan sesyapHistory ve aksiyonları al
    const sesyapHistory = useFarmStore(state => state.sesyapHistory);
    const addSesyapHistory = useFarmStore(state => state.addSesyapHistory);
    const clearSesyapHistory = useFarmStore(state => state.clearSesyapHistory);
    const addSesyapScore = useFarmStore(state => state.addSesyapScore);
    const queueQuestProgress = useFarmStore(state => state.queueQuestProgress);
    const farm = useFarmStore(state => state.farm);
    const phrasalVerbFarm = useFarmStore(state => state.phrasalVerbFarm);
    const inventory = useFarmStore(state => state.inventory);
    const phrasalVerbInventory = useFarmStore(state => state.phrasalVerbInventory);
    const guidedModeActive = useFarmStore(state => state.guidedModeActive);
    const guidedModeStep = useFarmStore(state => state.guidedModeStep);
    const guidedModeTargetWordId = useFarmStore(state => state.guidedModeTargetWordId);
    const guidedModeTargetWordText = useFarmStore(state => state.guidedModeTargetWordText);
    const stopGuidedMode = useFarmStore(state => state.stopGuidedMode);
    const activeThemeId = useFarmStore(state => state.activeCardTheme);
    const cardCustomization = useFarmStore(state => state.cardCustomization);

    const safeCustomization = cardCustomization || DEFAULT_CUSTOMIZATION;
    const cardSizeMultiplier = getCardSizeMultiplier(!!safeCustomization.compactMode, !!safeCustomization.largeMode);
    const borderPreset = BORDER_STYLES[safeCustomization.borderStyle || 'default'] || BORDER_STYLES.default;
    const fontStyleOverride = useMemo(
        () => getFontStyle(safeCustomization.fontStyle || 'default'),
        [safeCustomization.fontStyle]
    );
    const isSoilBackground = safeCustomization.backgroundStyle === 'soil';
    const overlayTheme = !isSoilBackground && activeThemeId !== 'default' ? getThemeOverlay(activeThemeId) : null;
    const tarlaCardWidth = useMemo(() => {
        if (safeCustomization.largeMode) return SCREEN_WIDTH - 44;
        const columns = safeCustomization.compactMode ? 3 : 2;
        const horizontalPadding = 32;
        const gap = 12;
        return Math.max(116, (SCREEN_WIDTH - horizontalPadding - gap * (columns - 1)) / columns);
    }, [safeCustomization.largeMode, safeCustomization.compactMode]);
    const tarlaCardMinHeight = useMemo(() => {
        const baseHeight = safeCustomization.compactMode ? 128 : 152;
        return Math.max(112, baseHeight * cardSizeMultiplier);
    }, [safeCustomization.compactMode, cardSizeMultiplier]);

    // Mod state
    const [activeMode, setActiveMode] = useState<SesYapMode>('calis');

    // State
    const [sentence, setSentence] = useState<SentenceData | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [filledWords, setFilledWords] = useState<Map<number, { word: string; isCorrect: boolean }>>(new Map());
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [questionCount, setQuestionCount] = useState(0);
    const [remainingTime, setRemainingTime] = useState(RECORDING_DURATION_MS / 1000);
    const [isComplete, setIsComplete] = useState(false);
    const [transcript, setTranscript] = useState<string>(''); // Kullanıcının söylediği
    const [micModalState, setMicModalState] = useState<MicModalState>('hidden');
    const [pendingMicStart, setPendingMicStart] = useState(false);

    const [pendingGuidedHistoryEntry, setPendingGuidedHistoryEntry] = useState<{
        word: string;
        wordId?: string;
        meaning_tr: string;
        example_en: string;
        example_tr: string;
        correct: boolean;
        timestamp: number;
    } | null>(null);
    const [guidedCompletionModalVisible, setGuidedCompletionModalVisible] = useState(false);
    const [guidedSentenceMissing, setGuidedSentenceMissing] = useState(false);
    const isGuidedSesYapStep = guidedModeActive && guidedModeStep === 'SESYAP_PRACTICE';
    // Cümle kelimeleri
    const sentenceWords = useMemo(() => {
        if (!sentence) return [];
        return sentence.example_en.split(' ').filter(w => w.trim().length > 0);
    }, [sentence]);

    const allFilled = filledWords.size === sentenceWords.length;
    const allCorrect = allFilled && Array.from(filledWords.values()).every(v => v.isCorrect);

    // Refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const isRecordingRef = useRef(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);
    const silenceCheckRef = useRef<NodeJS.Timeout | null>(null);
    const silenceCheckRunningRef = useRef(false);
    const silenceStartRef = useRef<number | null>(null);
    const hasSpokenRef = useRef(false);
    const isProcessingRef = useRef(false);
    const lastInternetAlertAtRef = useRef(0);

    const guidedMissingTraceRef = useRef(false);
    const appliedGuidedSentenceKeyRef = useRef<string>('');

    const resetSessionForSentence = useCallback((nextSentence: SentenceData | null) => {
        setSentence(nextSentence);
        setFilledWords(new Map());
        setRemainingTime(RECORDING_DURATION_MS / 1000);
        setIsComplete(false);
        setTranscript('');
        setIsRecording(false);
        setIsProcessing(false);
        isRecordingRef.current = false;
        isProcessingRef.current = false;
        silenceCheckRunningRef.current = false;
        silenceStartRef.current = null;
        hasSpokenRef.current = false;
        setPendingGuidedHistoryEntry(null);
        setGuidedCompletionModalVisible(false);
        if (timerRef.current) clearTimeout(timerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
        if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);
    }, []);

    const guidedTargetSentence = useMemo(() => {
        if (!isGuidedSesYapStep) return null;

        const targetWordId = typeof guidedModeTargetWordId === 'string' ? guidedModeTargetWordId.trim() : '';
        const targetWordKey = normalizeMatchKey(guidedModeTargetWordText);

        const pool = [
            ...(Array.isArray(farm) ? farm : []),
            ...(Array.isArray(phrasalVerbFarm) ? phrasalVerbFarm : []),
            ...(Array.isArray(inventory) ? inventory : []),
            ...(Array.isArray(phrasalVerbInventory) ? phrasalVerbInventory : []),
        ] as any[];

        const matchedStoreWord = pool.find((item) => {
            const itemId = typeof item?.id === 'string' ? item.id.trim() : '';
            if (targetWordId && itemId && itemId === targetWordId) return true;
            const itemWordKey = normalizeMatchKey(item?.text ?? item?.verb ?? item?.word);
            return !!targetWordKey && !!itemWordKey && targetWordKey === itemWordKey;
        });
        const fromStore = toSentenceData(matchedStoreWord, targetWordId || undefined);
        if (fromStore) return fromStore;

        const matchedDatasetWord = (ENSAGLAM_DATA.items || []).find((item) => {
            const itemWordKey = normalizeMatchKey(item.word);
            return !!targetWordKey && !!itemWordKey && targetWordKey === itemWordKey;
        });
        if (!matchedDatasetWord) return null;
        return toSentenceData({ ...matchedDatasetWord, wordId: targetWordId || undefined }, targetWordId || undefined);
    }, [isGuidedSesYapStep, guidedModeTargetWordId, guidedModeTargetWordText, farm, phrasalVerbFarm, inventory, phrasalVerbInventory]);

    useEffect(() => {
        if (!isGuidedSesYapStep) {
            guidedMissingTraceRef.current = false;
            appliedGuidedSentenceKeyRef.current = '';
            setGuidedSentenceMissing(false);
            return;
        }

        if (activeMode !== 'calis') {
            setActiveMode('calis');
        }

        if (!guidedTargetSentence) {
            setGuidedSentenceMissing(true);
            if (sentence !== null) {
                resetSessionForSentence(null);
            }
            if (!guidedMissingTraceRef.current) {
                guidedMissingTraceRef.current = true;
                traceEvent('guided_target_sentence_missing', {
                    step: guidedModeStep,
                    targetWordId: guidedModeTargetWordId,
                    targetWordText: guidedModeTargetWordText,
                }, 'warn');
            }
            return;
        }

        setGuidedSentenceMissing(false);
        guidedMissingTraceRef.current = false;

        const sentenceKey = `${guidedTargetSentence.wordId || ''}:${normalizeMatchKey(guidedTargetSentence.example_en)}`;
        if (appliedGuidedSentenceKeyRef.current === sentenceKey) return;
        appliedGuidedSentenceKeyRef.current = sentenceKey;
        resetSessionForSentence(guidedTargetSentence);
    }, [isGuidedSesYapStep, activeMode, guidedTargetSentence, resetSessionForSentence, guidedModeStep, guidedModeTargetWordId, guidedModeTargetWordText, sentence]);

    useEffect(() => {
        isProcessingRef.current = isProcessing;
    }, [isProcessing]);

    // Ilk cumleyi yukle
    useEffect(() => {
        loadNewSentence();

        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start();

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
            if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);
            //  TTS'i durdur  audio session akşmasn nle
            sound.stopSpeaking?.();
            sound.setRecordingActive?.(false);
        };
    }, []);

    // Yeni cumle yukle
    const loadNewSentence = useCallback(() => {
        if (isGuidedSesYapStep) {
            if (guidedTargetSentence) {
                resetSessionForSentence(guidedTargetSentence);
                return;
            }
            setGuidedSentenceMissing(true);
            resetSessionForSentence(null);
            return;
        }

        const newSentence = getRandomSentence();
        resetSessionForSentence(newSentence);
    }, [isGuidedSesYapStep, guidedTargetSentence, resetSessionForSentence]);

        const showInternetRequiredAlert = useCallback(() => {
        const now = Date.now();
        if (now - lastInternetAlertAtRef.current < 2500) return;
        lastInternetAlertAtRef.current = now;
        Alert.alert(
            'İnternet Gerekli',
            'SesYap doğruluk kontrolü için internet bağlantısı gerekiyor. Bağlantını kontrol edip tekrar dene.'
        );
        haptic.error();
    }, []);

    const ensureInternetForSesYap = useCallback(async () => {
        try {
            const netState = await NetInfo.fetch();
            const connected = netState.isConnected !== false;
            const reachable = netState.isInternetReachable !== false;
            const hasInternet = connected && reachable;
            if (!hasInternet) {
                showInternetRequiredAlert();
                return false;
            }
            return true;
        } catch {
            return true;
        }
    }, [showInternetRequiredAlert]);

    // Mikrofon press
    const handleMicPress = useCallback(async () => {
        try {
            if (isGuidedSesYapStep && guidedSentenceMissing) {
                haptic.warning();
                return;
            }

            if (isRecording) {
                if (timerRef.current) clearTimeout(timerRef.current);
                if (countdownRef.current) clearInterval(countdownRef.current);
                if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);
                await processRecording();
                return;
            }

            if (isRecordingRef.current || isProcessingRef.current || isComplete) return;

            const canStartWithInternet = await ensureInternetForSesYap();
            if (!canStartWithInternet) {
                setPendingMicStart(false);
                return;
            }

            const permission = await getMicrophonePermissionState();
            if (!permission.granted) {
                setPendingMicStart(true);
                setMicModalState(permission.canAskAgain ? 'needPermission' : 'settingsRequired');
                return;
            }

            isRecordingRef.current = true;
            hasSpokenRef.current = false;
            silenceStartRef.current = null;
            silenceCheckRunningRef.current = false;
            haptic.medium();
            sound.setRecordingActive?.(true);

            setIsRecording(true);
            setRemainingTime(RECORDING_DURATION_MS / 1000);

            const started = await startRecording();
            if (started) {
                const recordingStartTime = Date.now();

                let timeLeft = RECORDING_DURATION_MS / 1000;
                countdownRef.current = setInterval(() => {
                    timeLeft -= 1;
                    setRemainingTime(Math.max(0, timeLeft));
                    if (timeLeft <= 0 && countdownRef.current) {
                        clearInterval(countdownRef.current);
                    }
                }, 1000);

                silenceCheckRef.current = setInterval(async () => {
                    if (silenceCheckRunningRef.current || isProcessingRef.current || !isRecordingRef.current) return;
                    silenceCheckRunningRef.current = true;
                    try {
                        const status = await getRecordingStatus();
                        if (!status || !status.isRecording) return;

                        const metering = status.metering;
                        const elapsedTime = Date.now() - recordingStartTime;

                        if (metering > SILENCE_THRESHOLD) {
                            hasSpokenRef.current = true;
                            silenceStartRef.current = null;
                        } else if (hasSpokenRef.current && elapsedTime > MIN_SPEECH_TIME_MS) {
                            if (!silenceStartRef.current) {
                                silenceStartRef.current = Date.now();
                            } else {
                                const silenceDuration = Date.now() - silenceStartRef.current;
                                if (silenceDuration >= SILENCE_DURATION_MS) {
                                    if (timerRef.current) clearTimeout(timerRef.current);
                                    if (countdownRef.current) clearInterval(countdownRef.current);
                                    if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);
                                    await processRecording();
                                }
                            }
                        }
                    } finally {
                        silenceCheckRunningRef.current = false;
                    }
                }, 400);

                timerRef.current = setTimeout(async () => {
                    if (countdownRef.current) clearInterval(countdownRef.current);
                    if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);
                    await processRecording();
                }, RECORDING_DURATION_MS);
                return;
            }

            setIsRecording(false);
            isRecordingRef.current = false;
            setPendingMicStart(false);
            setMicModalState('startFailed');
        } catch (error) {
            console.error('[SesYap] handleMicPress error:', error);
            if (timerRef.current) clearTimeout(timerRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
            if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);
            silenceCheckRunningRef.current = false;
            isRecordingRef.current = false;
            setIsRecording(false);
            setIsProcessing(false);
            isProcessingRef.current = false;
            sound.setRecordingActive?.(false);
            setPendingMicStart(false);
            setMicModalState('startFailed');
        }
    }, [isComplete, isRecording, ensureInternetForSesYap, isGuidedSesYapStep, guidedSentenceMissing]);

    // Kayd ile işle
    const processRecording = useCallback(async () => {
        if (!isRecording && !isRecordingRef.current) return;
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        if (timerRef.current) clearTimeout(timerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
        if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);
        silenceCheckRunningRef.current = false;

        setIsRecording(false);
        setIsProcessing(true);
        haptic.light();
        //  Kayt bitti, audio mode deişebilir
        sound.setRecordingActive?.(false);

        try {
            const uri = await stopRecording();
            if (!uri || !sentence) {
                return;
            }

            const canTranscribeWithInternet = await ensureInternetForSesYap();
            if (!canTranscribeWithInternet) {
                await deleteRecording();
                return;
            }

            const speechResult = await transcribeAudio(uri);
            await deleteRecording();

            if (speechResult.error || !speechResult.transcript) {
                return;
            }

            // Karşlaştr
            const comparison = compareSentences(speechResult.transcript, sentence.example_en);

            // Kullanicinin soyledisini kaydet
            setTranscript(speechResult.transcript);

            // Her kelimeyi kontrol et ve slot'lara yerleştir
            const newFilledWords = new Map(filledWords);
            let newCorrectCount = 0;

            comparison.matchedWords.forEach((match, index) => {
                // Hedef kelimenin index'ini bul
                const cleanMatch = match.word.toLowerCase().replace(/[^a-z']/g, '');
                const targetIndex = sentenceWords.findIndex((w, i) => {
                    const cleanW = w.toLowerCase().replace(/[^a-z']/g, '');
                    return cleanW === cleanMatch && !newFilledWords.has(i);
                });

                if (targetIndex !== -1) {
                    newFilledWords.set(targetIndex, {
                        word: sentenceWords[targetIndex],
                        isCorrect: match.isCorrect,
                    });
                    if (match.isCorrect) newCorrectCount++;
                }
            });

            setFilledWords(newFilledWords);

            // Skor guncelle
            if (newCorrectCount > 0) {
                //  Tarlaya gonder + combo-based premium haptic!
                sound.playPlant();

                //  Combo-based premium haptic!
                if (newCorrectCount >= 5) {
                    haptic.masterCelebration(); // Tum kelimeleri soyledi!
                } else if (newCorrectCount >= 3) {
                    haptic.rigid();
                    setTimeout(() => haptic.heavy(), 50);
                } else {
                    haptic.heavy();
                    setTimeout(() => haptic.success(), 50);
                }

                setScore(prev => prev + newCorrectCount * 10);
                setCombo(prev => prev + newCorrectCount);
                // Store'a da ekle
                addSesyapScore(newCorrectCount * 10);
            } else if (comparison.matchedWords.length > 0) {
                sound.playWrong();
                haptic.error();
                setTimeout(() => haptic.medium(), 50);
                setCombo(0);
            }

            // Tamamlandi mi?
            if (newFilledWords.size === sentenceWords.length) {
                const allCorrect = Array.from(newFilledWords.values()).every(v => v.isCorrect);
                setIsComplete(true);
                setQuestionCount(prev => prev + 1);

                //  Tarla gemişine kaydet (store'a persist edilir)
                if (sentence) {
                    const historyEntry = {
                        word: normalizeDisplayText(sentence.word),
                        wordId: sentence.wordId,
                        meaning_tr: normalizeDisplayText(sentence.meaning_tr),
                        example_en: normalizeDisplayText(sentence.example_en),
                        example_tr: normalizeDisplayText(sentence.example_tr),
                        correct: allCorrect,
                        timestamp: Date.now(),
                    };

                    if (isGuidedSesYapStep) {
                        if (allCorrect) {
                            setPendingGuidedHistoryEntry(historyEntry);
                            setGuidedCompletionModalVisible(true);
                        } else {
                            setPendingGuidedHistoryEntry(null);
                        }
                    } else {
                        addSesyapHistory(historyEntry);
                    }
                }

                if (allCorrect) {
                    // s-> Mukemmel - epik hasat! Premium kutlama!
                    haptic.masterCelebration();
                    sound.playEpicHarvest();
                    setScore(prev => prev + 50); // Bonus
                    addSesyapScore(50); // Store bonus
                    queueQuestProgress('SPEECH_PRACTICE', 1, 'add');
                }
            }
        } catch (error) {
            console.error('[SesYap] processRecording error:', error);
        } finally {
            setIsProcessing(false);
            isProcessingRef.current = false;
            isRecordingRef.current = false;
            setRemainingTime(RECORDING_DURATION_MS / 1000);
        }
    }, [isRecording, sentence, filledWords, sentenceWords, addSesyapHistory, addSesyapScore, ensureInternetForSesYap, queueQuestProgress, isGuidedSesYapStep]);

    // Sonraki soru
    const handleNext = useCallback(() => {
        if (isGuidedSesYapStep) {
            if (!allCorrect || !pendingGuidedHistoryEntry) {
                haptic.warning();
                return;
            }
            setGuidedCompletionModalVisible(true);
            return;
        }

        haptic.medium();
        setTimeout(() => haptic.light(), 50);
        loadNewSentence();
    }, [isGuidedSesYapStep, allCorrect, pendingGuidedHistoryEntry, loadNewSentence]);

    // Tekrar dene
    const handleRetry = useCallback(() => {
        haptic.medium();
        setTimeout(() => haptic.light(), 40);
        setFilledWords(new Map());
        setIsComplete(false);
        setRemainingTime(RECORDING_DURATION_MS / 1000);
    }, []);

    const openTarlaSentence = useCallback((item: { word: string; meaning_tr: string; example_en: string; example_tr: string; }) => {
        if (isGuidedSesYapStep) return;
        if (isProcessing || isRecordingRef.current) return;

        haptic.light();
        setActiveMode('calis');
        setSentence({
            word: normalizeDisplayText(item.word),
            meaning_tr: normalizeDisplayText(item.meaning_tr),
            example_en: normalizeDisplayText(item.example_en),
            example_tr: normalizeDisplayText(item.example_tr),
        });
        setFilledWords(new Map());
        setRemainingTime(RECORDING_DURATION_MS / 1000);
        setIsComplete(false);
        setTranscript('');
        setIsRecording(false);
        setIsProcessing(false);

        if (timerRef.current) clearTimeout(timerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
        if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);
        isRecordingRef.current = false;
        silenceCheckRunningRef.current = false;
        silenceStartRef.current = null;
        hasSpokenRef.current = false;
    }, [isProcessing, isGuidedSesYapStep]);

    //  Cumleyi seslendir
    const handleSpeakSentence = useCallback(() => {
        if (!sentence?.example_en) return;
        haptic.medium();
        sound.speakSentence(sentence.example_en, 'en-US');
    }, [sentence]);

    // Geri - Glendirilmiş navigasyon (DailyQuestsPanel'den gelse de alşr)
    const handleBack = useCallback(() => {
        if (isGuidedSesYapStep) {
            Alert.alert(
                'Müfredatı Sonlandır',
                'Yönlendirmeli SesYap adımını bitirmeden çıkarsan akış sonlanacak.',
                [
                    { text: 'Vazgeç', style: 'cancel' },
                    {
                        text: 'Sonlandır',
                        style: 'destructive',
                        onPress: () => {
                            haptic.medium();
                            stopGuidedMode();
                            navigation.dispatch(
                                CommonActions.reset({
                                    index: 0,
                                    routes: [{ name: 'Home' as never }],
                                })
                            );
                        },
                    },
                ],
                { cancelable: true }
            );
            return;
        }

        haptic.medium();

        // nce goBack dene, eer alşmazsa Home'a git
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            // Fallback: Home'a reset
            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Home' }],
                })
            );
        }
    }, [isGuidedSesYapStep, navigation, stopGuidedMode]);

    const handleGuidedMissingExit = useCallback(() => {
        haptic.medium();
        stopGuidedMode();
        setGuidedSentenceMissing(false);
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: 'Home' as never }],
            })
        );
    }, [navigation, stopGuidedMode]);

    const handleGuidedCompletionConfirm = useCallback(() => {
        if (!pendingGuidedHistoryEntry) {
            setGuidedCompletionModalVisible(false);
            return;
        }
        haptic.success();
        addSesyapHistory(pendingGuidedHistoryEntry);
        setPendingGuidedHistoryEntry(null);
        setGuidedCompletionModalVisible(false);
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: 'Home' as never }],
            })
        );
    }, [addSesyapHistory, navigation, pendingGuidedHistoryEntry]);

    const handleMicPermissionConfirm = useCallback(async () => {
        const requested = await requestMicrophonePermission();
        if (!requested.granted) {
            setMicModalState(requested.canAskAgain ? 'needPermission' : 'settingsRequired');
            return;
        }

        setMicModalState('hidden');
        const shouldStart = pendingMicStart;
        setPendingMicStart(false);

        if (shouldStart) {
            setTimeout(() => {
                handleMicPress().catch(() => {
                    setMicModalState('startFailed');
                });
            }, 120);
        }
    }, [pendingMicStart, handleMicPress]);

    const handleMicModalClose = useCallback(() => {
        setMicModalState('hidden');
        setPendingMicStart(false);
    }, []);

    const handleOpenSettings = useCallback(() => {
        setMicModalState('hidden');
        setPendingMicStart(false);
        Linking.openSettings().catch(() => {});
    }, []);

        const micModalConfig = useMemo(() => {
        if (micModalState === 'needPermission') {
            return {
                visible: true,
                title: 'Mikrofon İzni',
                titleEmoji: '\u{1F399}️',
                message: 'SesYap için mikrofon izni gerekiyor. İzin verirsen telaffuz kontrolü başlayacak.',
                secondaryMessage: 'İzin olmadan konuşma kaydı alınamaz.',
                type: 'warning' as const,
                buttons: [
                    { text: 'Şimdi İzin Ver', type: 'primary' as const, onPress: handleMicPermissionConfirm },
                    { text: 'Vazgeç', type: 'cancel' as const, onPress: handleMicModalClose },
                ],
            };
        }

        if (micModalState === 'settingsRequired') {
            return {
                visible: true,
                title: 'İzin Kapalı',
                titleEmoji: '\u{1F512}',
                message: 'Mikrofon izni sistemde kapatılmış. Ayarlardan izin verip geri dönebilirsin.',
                secondaryMessage: 'Ayarlar > FarmEnglish > Mikrofon',
                type: 'error' as const,
                buttons: [
                    { text: 'Ayarları Aç', type: 'primary' as const, onPress: handleOpenSettings },
                    { text: 'Kapat', type: 'cancel' as const, onPress: handleMicModalClose },
                ],
            };
        }

        if (micModalState === 'startFailed') {
            return {
                visible: true,
                title: 'Mikrofon Başlatılamadı',
                titleEmoji: '\u{26A0}️',
                message: 'Kayıt başlatılamadı. Lütfen tekrar dene.',
                secondaryMessage: 'Sorun sürerse uygulamayı yeniden açıp tekrar dene.',
                type: 'error' as const,
                buttons: [
                    { text: 'Tamam', type: 'primary' as const, onPress: handleMicModalClose },
                ],
            };
        }

        return {
            visible: false,
            title: '',
            titleEmoji: '',
            message: '',
            secondaryMessage: '',
            type: 'info' as const,
            buttons: [] as Array<{ text: string; type: 'primary' | 'cancel'; onPress: () => void }>,
        };
    }, [micModalState, handleMicPermissionConfirm, handleMicModalClose, handleOpenSettings]);

        // Loading
    if (!sentence) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.accent} />
                <Text style={styles.loadingText}>Yükleniyor...</Text>
                <JuicyModal
                    visible={guidedSentenceMissing}
                    onClose={() => {}}
                    title="Hedef Cümle Bulunamadı"
                    titleEmoji={'⚠️'}
                    message="Bu guided adım için hedef kelimenin örnek cümlebulunamadı."
                    secondaryMessage="Akış güvenli şekilde sonlandırılabilir."
                    type="error"
                    buttons={[
                        { text: 'Müfredatı Sonlandır', type: 'primary', onPress: handleGuidedMissingExit },
                    ]}
                />
            </View>
        );
    }
    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0F172A', '#1E1B4B', '#0F172A']}
                style={styles.gradient}
            >
                <SafeAreaView style={styles.safeArea}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                            <ChevronLeft size={28} color={COLORS.text} />
                        </TouchableOpacity>

                        <View style={styles.headerCenter}>
                            <Sparkles size={18} color={COLORS.accent} />
                            <Text style={styles.headerTitle}>SesYap</Text>
                        </View>

                        <View style={styles.scoreContainer}>
                            <Star size={14} color="#FBBF24" fill="#FBBF24" />
                            <Text style={styles.scoreText}>{score}</Text>
                        </View>
                    </View>

                    <View style={styles.modeSelector}>
                        <Pressable
                            style={[styles.modeTab, activeMode === 'calis' && styles.modeTabActive]}
                            onPress={() => {
                                if (activeMode !== 'calis') {
                                    haptic.light();
                                    setActiveMode('calis');
                                }
                            }}
                        >
                            <BookOpen
                                size={16}
                                color={activeMode === 'calis' ? '#FFFFFF' : COLORS.textMuted}
                            />
                            <Text style={[styles.modeTabText, activeMode === 'calis' && styles.modeTabTextActive]}>
                                Çalış
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[
                                styles.modeTab,
                                activeMode === 'tarla' && styles.modeTabActive,
                                isGuidedSesYapStep && styles.modeTabLocked,
                            ]}
                            onPress={() => {
                                if (isGuidedSesYapStep) {
                                    haptic.warning();
                                    return;
                                }
                                if (activeMode !== 'tarla') {
                                    haptic.light();
                                    setActiveMode('tarla');
                                }
                            }}
                            disabled={isGuidedSesYapStep}
                        >
                            <Wheat
                                size={16}
                                color={activeMode === 'tarla' ? '#FFFFFF' : COLORS.textMuted}
                            />
                            <Text style={[styles.modeTabText, activeMode === 'tarla' && styles.modeTabTextActive]}>
                                Tarla
                            </Text>
                        </Pressable>
                    </View>

                    {activeMode === 'calis' && (
                        <View style={styles.progressRow}>
                            <Text style={styles.progressText}>Soru {questionCount + 1}</Text>
                            {combo > 0 && (
                                <View style={styles.comboBadge}>
                                    <Text style={styles.comboText}>Combo {combo}x</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {isGuidedSesYapStep && (
                        <View style={styles.guidedInfoBanner}>
                            <Text style={styles.guidedInfoText}>
                                Hedef kelime: "{normalizeDisplayText(sentence.word)}". Cümleyi birebir doğru söyle, sonra adımı tamamla.
                            </Text>
                        </View>
                    )}

                    {activeMode === 'calis' ? (
                        <ScrollView
                            style={styles.calisScrollView}
                            contentContainerStyle={styles.calisScrollContent}
                            showsVerticalScrollIndicator={false}
                            bounces={true}
                        >
                        <Animated.View
                            style={[
                                styles.content,
                                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                            ]}
                        >
                            {/* Hedef kelime karti */}
                            <View style={styles.targetCard}>
                                <LinearGradient
                                    colors={['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.05)']}
                                    style={styles.targetCardGradient}
                                >
                                    <Text style={styles.targetLabel}>Öğren:</Text>
                                    <Text style={styles.targetWord}>{normalizeDisplayText(sentence.word)}</Text>
                                    <Text style={styles.targetMeaning}>{normalizeDisplayText(sentence.meaning_tr)}</Text>
                                </LinearGradient>
                            </View>

                            {/* Cumle alani - Yapboz tarzi slot'lar */}
                            <View style={styles.sentenceArea}>
                                <Text style={styles.sentenceLabel}>Bu cümleyi söyle:</Text>

                                <View style={styles.slotsContainer}>
                                    {sentenceWords.map((word, index) => {
                                        const filled = filledWords.get(index);
                                        let status: 'pending' | 'correct' | 'wrong' = 'pending';
                                        if (filled) {
                                            status = filled.isCorrect ? 'correct' : 'wrong';
                                        }
                                        return (
                                            <WordSlot
                                                key={`${word}-${index}`}
                                                word={word}
                                                status={status}
                                                index={index}
                                            />
                                        );
                                    })}
                                </View>

                                <Text style={styles.translationHint}>İpucu: {normalizeDisplayText(sentence.example_tr)}</Text>
                            </View>

                            {/* Mikrofon veya sonuc butonlari */}
                            <View style={styles.actionArea}>
                                {/* Soyledisin */}
                                {transcript ? (
                                    <View style={styles.transcriptBox}>
                                        <Text style={styles.transcriptLabel}>Sen:</Text>
                                        <Text style={styles.transcriptText}>"{transcript}"</Text>
                                    </View>
                                ) : null}

                                {isComplete ? (
                                    <View style={styles.resultArea}>
                                        {/* Sonuc gosterimi */}
                                        <View style={[
                                            styles.resultBadge,
                                            { backgroundColor: allCorrect ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)' }
                                        ]}>
                                            <Text style={styles.resultEmoji}>
                                                {allCorrect ? 'OK' : '!'}
                                            </Text>
                                            <Text style={[
                                                styles.resultText,
                                                { color: allCorrect ? COLORS.success : COLORS.warning }
                                            ]}>
                                                {allCorrect ? 'Mükemmel!' : 'Devam et!'}
                                            </Text>
                                        </View>

                                        {/* Butonlar */}
                                        <View style={styles.resultButtons}>
                                            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                                                <RotateCcw size={18} color={COLORS.accent} />
                                                <Text style={styles.retryButtonText}>Tekrar</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity style={[styles.nextButton, isGuidedSesYapStep && !allCorrect && { opacity: 0.5 }]} onPress={handleNext} disabled={isGuidedSesYapStep && !allCorrect}>
                                                <LinearGradient
                                                    colors={['#22C55E', '#16A34A']}
                                                    style={styles.nextButtonGradient}
                                                >
                                                    <Text style={styles.nextButtonText}>{isGuidedSesYapStep ? 'Adımı Tamamla' : 'Sonraki'}</Text>
                                                    <SkipForward size={18} color="#FFFFFF" />
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.buttonsRow}>
                                        <MicButton
                                            isRecording={isRecording}
                                            isProcessing={isProcessing}
                                            remainingTime={remainingTime}
                                            onPress={handleMicPress}
                                        />
                                        <SpeakButton
                                            sentence={sentence}
                                            disabled={isProcessing || isRecording}
                                            onPress={handleSpeakSentence}
                                        />
                                    </View>
                                )}
                            </View>
                        </Animated.View>
                        </ScrollView>
                    ) : (
                        /* Tarla modu - Gemiş cmleler */
                        <ScrollView style={styles.tarlaContent} contentContainerStyle={styles.tarlaContentContainer}>
                            <View style={styles.tarlaGuideCard}>
                                <Text style={styles.tarlaGuideText}>SesYap'ta mükemmel bildiklerin meyvedir, bilemediklerin tohumdur. Buradan seçerek hem bilemediklerine hem bildiklerine çalışabilirsin.</Text>
                            </View>

                            <View style={styles.tarlaHeader}>
                                <Text style={styles.tarlaTitle}>Senin Tarlan</Text>
                                <Text style={styles.tarlaSubtitle}>
                                    {sesyapHistory.length === 0
                                        ? 'Henüz çalıştığın cümle yok'
                                        : `${sesyapHistory.filter(h => h.correct).length} meyve / ${sesyapHistory.filter(h => !h.correct).length} tohum`
                                    }
                                </Text>
                            </View>

                            {sesyapHistory.length === 0 ? (
                                <View style={styles.tarlaEmpty}>
                                    <Text style={styles.tarlaEmptyEmoji}>{'\u{1F331}'}</Text>
                                    <Text style={styles.tarlaEmptyText}>Çalış modunda pratik yap.</Text>
                                    <Text style={styles.tarlaEmptyText}>Kartlardan birini seçerek cümleyi tekrar et.</Text>
                                </View>
                            ) : (
                                <View style={styles.tarlaGrid}>
                                    {sesyapHistory.map((item, index) => {
                                        const displayWord = normalizeDisplayText(item.word);
                                        const displayMeaning = normalizeDisplayText(item.meaning_tr);
                                        const baseTheme = item.correct
                                            ? {
                                                gradient: ['rgba(20, 83, 45, 0.96)', 'rgba(6, 95, 70, 0.92)', 'rgba(20, 83, 45, 0.96)'] as const,
                                                border: 'rgba(34, 197, 94, 0.72)',
                                                textMain: '#dcfce7',
                                                textSecondary: '#bbf7d0',
                                                badgeBg: 'rgba(34, 197, 94, 0.32)',
                                                badgeText: '#86efac',
                                            }
                                            : {
                                                gradient: ['rgba(113, 63, 18, 0.96)', 'rgba(133, 77, 14, 0.92)', 'rgba(113, 63, 18, 0.96)'] as const,
                                                border: 'rgba(234, 179, 8, 0.72)',
                                                textMain: '#fef08a',
                                                textSecondary: '#fde047',
                                                badgeBg: 'rgba(234, 179, 8, 0.3)',
                                                badgeText: '#fef08a',
                                            };
                                        const themedBase = overlayTheme
                                            ? {
                                                ...baseTheme,
                                                border: overlayTheme.borderColor,
                                            }
                                            : baseTheme;
                                        const theme = isSoilBackground
                                            ? {
                                                ...themedBase,
                                                gradient: ['rgba(36, 20, 13, 0.98)', 'rgba(58, 36, 30, 0.96)', 'rgba(28, 16, 11, 0.98)'] as const,
                                                border: 'rgba(121, 85, 72, 0.86)',
                                                textMain: '#f7efe4',
                                                textSecondary: '#ddc7ae',
                                                badgeBg: 'rgba(93, 64, 55, 0.5)',
                                                badgeText: '#f2e5d4',
                                            }
                                            : themedBase;

                                        return (
                                            <TouchableOpacity
                                                key={`${item.word}-${index}`}
                                                style={[styles.tarlaCardWrapper, { width: tarlaCardWidth }]}
                                                onPress={() => {
                                                    openTarlaSentence(item);
                                                }}
                                                activeOpacity={0.9}
                                            >
                                                <LinearGradient
                                                    colors={theme.gradient}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                    style={[
                                                        styles.tarlaCard,
                                                        {
                                                            borderColor: theme.border,
                                                            borderRadius: borderPreset.borderRadius,
                                                            borderWidth: borderPreset.borderWidth,
                                                            minHeight: tarlaCardMinHeight,
                                                        },
                                                    ]}
                                                >
                                                    <View style={styles.tarlaCardGlass} />
                                                    <View
                                                        style={[
                                                            styles.tarlaBadge,
                                                            {
                                                                backgroundColor: theme.badgeBg,
                                                                borderColor: theme.border,
                                                            },
                                                        ]}
                                                    >
                                                        {safeCustomization.showEmoji && (
                                                            <Text style={styles.tarlaBadgeEmoji}>{item.correct ? '\u{1F34E}' : '\u{1F331}'}</Text>
                                                        )}
                                                        <Text
                                                            style={[
                                                                styles.tarlaBadgeText,
                                                                { color: theme.badgeText },
                                                                fontStyleOverride,
                                                            ]}
                                                        >
                                                            {item.correct ? 'MEYVE' : 'TOHUM'}
                                                        </Text>
                                                    </View>
                                                    <Text
                                                        style={[
                                                            styles.tarlaItemWord,
                                                            { color: theme.textMain },
                                                            fontStyleOverride,
                                                        ]}
                                                        numberOfLines={2}
                                                    >
                                                        {displayWord}
                                                    </Text>
                                                    <Text
                                                        style={[
                                                            styles.tarlaItemMeaning,
                                                            { color: theme.textSecondary },
                                                            fontStyleOverride,
                                                        ]}
                                                        numberOfLines={2}
                                                    >
                                                        {displayMeaning}
                                                    </Text>
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}

                        </ScrollView>
                    )}
                    <JuicyModal
                        visible={guidedCompletionModalVisible}
                        onClose={() => {}}
                        title="SesYap Adımı Tamamlandı"
                        titleEmoji={'\u{1F389}'}
                        message="Hedef cümleyi doğru tamamladın. Devam ile yönlendirmeli akış bitecek."
                        secondaryMessage={
                            pendingGuidedHistoryEntry
                                ? `Kelime: ${normalizeDisplayText(pendingGuidedHistoryEntry.word)}`
                                : ''
                        }
                        type="success"
                        buttons={[
                            { text: 'Devam', type: 'primary', onPress: handleGuidedCompletionConfirm },
                        ]}
                    />

                    <JuicyModal
                        visible={micModalConfig.visible}
                        onClose={handleMicModalClose}
                        title={micModalConfig.title}
                        titleEmoji={micModalConfig.titleEmoji}
                        message={micModalConfig.message}
                        secondaryMessage={micModalConfig.secondaryMessage}
                        type={micModalConfig.type}
                        buttons={micModalConfig.buttons}
                    />
                </SafeAreaView>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    gradient: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: COLORS.textMuted,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(251, 191, 36, 0.15)',
        borderRadius: 16,
    },
    scoreText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FBBF24',
    },

    // Progress
    progressRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 6,
    },
    progressText: {
        fontSize: 13,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    comboBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: 'rgba(249, 115, 22, 0.2)',
        borderRadius: 12,
    },
    comboText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#F97316',
    },

    // alş modu ScrollView
    calisScrollView: {
        flex: 1,
    },
    calisScrollContent: {
        flexGrow: 1,
        paddingBottom: 20,
    },

    // Content
    content: {
        flex: 1,
        paddingHorizontal: 16,
    },

    // Target Card
    targetCard: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.2)',
    },
    targetCardGradient: {
        padding: 16,
        alignItems: 'center',
    },
    targetLabel: {
        fontSize: 11,
        color: COLORS.textMuted,
        marginBottom: 4,
    },
    targetWord: {
        fontSize: 26,
        fontWeight: '800',
        color: COLORS.accent,
        marginBottom: 4,
    },
    targetMeaning: {
        fontSize: 14,
        color: COLORS.textMuted,
    },

    // Sentence Area
    sentenceArea: {
        marginBottom: 24,
    },
    sentenceLabel: {
        fontSize: 13,
        color: COLORS.textMuted,
        marginBottom: 12,
        textAlign: 'center',
    },
    slotsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 8,
    },
    translationHint: {
        fontSize: 13,
        color: COLORS.textMuted,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 12,
        paddingHorizontal: 16,
        marginBottom: 8,
    },

    // Word Slot
    wordSlot: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 2,
        minWidth: 50,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 5,
    },
    slotContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    wordSlotText: {
        fontSize: 17,
        fontWeight: '700',
    },
    slotIcon: {
        marginLeft: 2,
    },
    slotPlaceholder: {
        alignItems: 'center',
    },
    placeholderDash: {
        fontSize: 18,
        fontWeight: '700',
        color: 'rgba(139, 92, 246, 0.4)',
        letterSpacing: 2,
    },

    // Transcript Box
    transcriptBox: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    transcriptLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginBottom: 4,
    },
    transcriptText: {
        fontSize: 15,
        color: COLORS.text,
        fontStyle: 'italic',
        textAlign: 'center',
    },

    // Action Area
    actionArea: {
        paddingBottom: IS_SMALL_DEVICE ? 100 : 120, // Navbar icin daha fazla alan
        alignItems: 'center',
    },

    // Mic Button
    micContainer: {
        alignItems: 'center',
        justifyContent: 'flex-start',
        minHeight: 112,
    },
    micRing: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.error,
    },
    micButtonWrapper: {
        width: 86,
        height: 86,
        alignItems: 'center',
        justifyContent: 'center',
    },
    micButtonGlow: {
        position: 'absolute',
        width: 90,
        height: 90,
        borderRadius: 45,
        shadowOpacity: 0.6,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 0 },
        elevation: 14,
    },
    micButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        overflow: 'hidden',
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 10,
    },
    micButtonRecording: {
        shadowColor: COLORS.error,
    },
    micButtonGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    micHint: {
        marginTop: 12,
        fontSize: 13,
        color: COLORS.textMuted,
        fontWeight: '600',
    },

    // Result Area
    resultArea: {
        alignItems: 'center',
    },
    resultBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 16,
        marginBottom: 20,
    },
    resultEmoji: {
        fontSize: 24,
    },
    resultText: {
        fontSize: 18,
        fontWeight: '700',
    },
    resultButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 18,
        paddingVertical: 12,
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.3)',
    },
    retryButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.accent,
    },
    nextButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    nextButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    nextButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    speakButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        overflow: 'hidden',
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 10,
    },
    speakButtonGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    speakButtonContainer: {
        alignItems: 'center',
        justifyContent: 'flex-start',
        minHeight: 112,
    },
    speakHint: {
        marginTop: 12,
        fontSize: 13,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    buttonsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: 16,
    },

    // Mod secici
    modeSelector: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginVertical: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 4,
    },
    modeTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
    },
    modeTabActive: {
        backgroundColor: COLORS.accent,
    },
    modeTabLocked: {
        opacity: 0.45,
    },
    modeTabText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    modeTabTextActive: {
        color: '#FFFFFF',
    },
    guidedInfoBanner: {
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.55)',
        backgroundColor: 'rgba(21, 128, 61, 0.16)',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    guidedInfoText: {
        fontSize: 12,
        lineHeight: 18,
        color: '#DCFCE7',
        fontWeight: '700',
    },

    // Tarla modu
    tarlaContent: {
        flex: 1,
    },
    tarlaContentContainer: {
        paddingHorizontal: 16,
        paddingBottom: 120,
    },
    tarlaGuideCard: {
        marginTop: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.35)',
        backgroundColor: 'rgba(15, 118, 110, 0.18)',
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    tarlaGuideText: {
        color: '#ccfbf1',
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '600',
    },
    tarlaHeader: {
        alignItems: 'center',
        marginVertical: 20,
    },
    tarlaTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 4,
    },
    tarlaSubtitle: {
        fontSize: 14,
        color: COLORS.textMuted,
    },
    tarlaEmpty: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    tarlaEmptyEmoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    tarlaEmptyText: {
        fontSize: 16,
        color: COLORS.textMuted,
        textAlign: 'center',
    },
    tarlaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    tarlaCardWrapper: {
        marginBottom: 12,
    },
    tarlaCard: {
        overflow: 'hidden',
        paddingHorizontal: 12,
        paddingVertical: 12,
        justifyContent: 'flex-start',
    },
    tarlaCardGlass: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    tarlaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginBottom: 8,
        gap: 4,
    },
    tarlaBadgeEmoji: {
        fontSize: 12,
    },
    tarlaBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    tarlaItemWord: {
        fontSize: 16,
        fontWeight: '800',
        lineHeight: 20,
    },
    tarlaItemMeaning: {
        fontSize: 12,
        marginTop: 6,
        lineHeight: 16,
    },
});

