/**
 * 🎤 SesYap Ekranı - Yapboz Tarzı Konuşma Modu
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
    Alert,
    ScrollView,
    Easing,
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
import { startRecording, stopRecording, transcribeAudio, deleteRecording, getRecordingStatus } from '../utils/speechToText';
import { compareSentences, ComparisonResult } from '../utils/compareSentences';
import { useFarmStore } from '../store/farmStore';

// Örnek cümleler veri kaynağı
import ensaglamData from '../../assets/data/ensaglamdata_with_example_tr.json';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_SMALL_DEVICE = SCREEN_HEIGHT < 700;

// Mod tipleri
type SesYapMode = 'calis' | 'tarla';

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
    word: string;
    meaning_tr: string;
    example_en: string;
    example_tr: string;
}

// 🎲 Rastgele örnek cümle seç (performans için önceden filtrelenmiş)
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
        word: item.word,
        meaning_tr: item.tr,
        example_en: item.example,
        example_tr: item.example_tr,
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
                <Text style={[styles.wordSlotText, { color: getTextColor() }]}>
                    {word}
                </Text>
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

// 🎤 Mikrofon Butonu
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
                    ? '🔍 Kontrol ediliyor...'
                    : isRecording
                        ? `🎙️ ${remainingTime}s`
                        : '🎤 Konuş'}
            </Text>
        </View>
    );
});
MicButton.displayName = 'MicButton';

// � Cümle Seslendirme Butonu
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

            <Text style={styles.speakHint}>🔊 Seslendir</Text>
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
    const updateQuestProgress = useFarmStore(state => state.updateQuestProgress);

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

    // Cümle kelimeleri
    const sentenceWords = useMemo(() => {
        if (!sentence) return [];
        return sentence.example_en.split(' ').filter(w => w.trim().length > 0);
    }, [sentence]);

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

    // İlk cümleyi yükle
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
            // 🛡️ TTS'i durdur — audio session çakışmasını önle
            sound.stopSpeaking?.();
            sound.setRecordingActive?.(false);
        };
    }, []);

    // Yeni cümle yükle
    const loadNewSentence = useCallback(() => {
        const newSentence = getRandomSentence();
        setSentence(newSentence);
        setFilledWords(new Map());
        setRemainingTime(RECORDING_DURATION_MS / 1000);
        setIsComplete(false);
        setTranscript(''); // Transcript'i temizle
    }, []);

    // 🎤 Mikrofon press
    const handleMicPress = useCallback(async () => {
        if (isRecording) {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
            if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);
            await processRecording();
            return;
        }

        if (isRecordingRef.current || isProcessing || isComplete) return;

        isRecordingRef.current = true;
        hasSpokenRef.current = false;
        silenceStartRef.current = null;
        silenceCheckRunningRef.current = false;
        haptic.medium();
        // 🛡️ Audio mode thrashing önle
        sound.setRecordingActive?.(true);

        // ⚡ Anında UI tepki ver
        setIsRecording(true);
        setRemainingTime(RECORDING_DURATION_MS / 1000);

        const started = await startRecording();
        if (started) {
            const recordingStartTime = Date.now();

            // Countdown
            let timeLeft = RECORDING_DURATION_MS / 1000;
            countdownRef.current = setInterval(() => {
                timeLeft -= 1;
                setRemainingTime(Math.max(0, timeLeft));
                if (timeLeft <= 0 && countdownRef.current) {
                    clearInterval(countdownRef.current);
                }
            }, 1000);

            // Sessizlik algılama
            silenceCheckRef.current = setInterval(async () => {
                if (silenceCheckRunningRef.current || isProcessing || !isRecordingRef.current) return;
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
                            console.log('🔇 Sessizlik algılandı');
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
            }, 400); // 120 → 400ms - RN bridge yükünü azalt, kasma önle

            // Max süre
            timerRef.current = setTimeout(async () => {
                if (countdownRef.current) clearInterval(countdownRef.current);
                if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);
                await processRecording();
            }, RECORDING_DURATION_MS);
        } else {
            // Başlatılamadı -> UI'ı geri al
            setIsRecording(false);
            isRecordingRef.current = false;
            Alert.alert('Mikrofon Hatası', 'Mikrofon erişimi sağlanamadı.');
        }
    }, [isProcessing, isComplete, isRecording]);

    // 🔊 Kaydı işle
    const processRecording = useCallback(async () => {
        if (!isRecording && !isRecordingRef.current) return;

        if (timerRef.current) clearTimeout(timerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
        if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);
        silenceCheckRunningRef.current = false;

        setIsRecording(false);
        setIsProcessing(true);
        haptic.light();
        // 🛡️ Kayıt bitti, audio mode değişebilir
        sound.setRecordingActive?.(false);

        try {
            const uri = await stopRecording();
            if (!uri || !sentence) {
                setIsProcessing(false);
                isRecordingRef.current = false;
                return;
            }

            const speechResult = await transcribeAudio(uri);
            await deleteRecording();

            if (speechResult.error || !speechResult.transcript) {
                setIsProcessing(false);
                isRecordingRef.current = false;
                return;
            }

            // Karşılaştır
            const comparison = compareSentences(speechResult.transcript, sentence.example_en);

            // Kullanıcının söylediğini kaydet
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

            // Skor güncelle
            if (newCorrectCount > 0) {
                // 🌾 Tarlaya gönder + combo-based premium haptic!
                sound.playPlant();
                
                // 🎮 Combo-based premium haptic!
                if (newCorrectCount >= 5) {
                    haptic.masterCelebration(); // Tüm kelimeleri söyledi!
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

            // Tamamlandı mı?
            if (newFilledWords.size === sentenceWords.length) {
                const allCorrect = Array.from(newFilledWords.values()).every(v => v.isCorrect);
                setIsComplete(true);
                setQuestionCount(prev => prev + 1);

                // 📚 Tarla geçmişine kaydet (store'a persist edilir)
                if (sentence) {
                    addSesyapHistory({
                        word: sentence.word,
                        meaning_tr: sentence.meaning_tr,
                        example_en: sentence.example_en,
                        example_tr: sentence.example_tr,
                        correct: allCorrect,
                        timestamp: Date.now(),
                    });
                }

                if (allCorrect) {
                    // 🏆 Mükemmel - epik hasat! Premium kutlama!
                    haptic.masterCelebration();
                    sound.playEpicHarvest();
                    setScore(prev => prev + 50); // Bonus
                    addSesyapScore(50); // Store bonus
                    updateQuestProgress('SPEECH_PRACTICE', 1); // 🎯 Günlük görev
                }
            }
        } catch (error) {
            console.error('İşlem hatası:', error);
        }

        setIsProcessing(false);
        isRecordingRef.current = false;
        setRemainingTime(RECORDING_DURATION_MS / 1000);
    }, [isRecording, sentence, filledWords, sentenceWords, addSesyapHistory, addSesyapScore]);

    // Sonraki soru
    const handleNext = useCallback(() => {
        haptic.medium();
        setTimeout(() => haptic.light(), 50);
        loadNewSentence();
    }, [loadNewSentence]);

    // Tekrar dene
    const handleRetry = useCallback(() => {
        haptic.medium();
        setTimeout(() => haptic.light(), 40);
        setFilledWords(new Map());
        setIsComplete(false);
        setRemainingTime(RECORDING_DURATION_MS / 1000);
    }, []);

    const openTarlaSentence = useCallback((item: { word: string; meaning_tr: string; example_en: string; example_tr: string; }) => {
        if (isProcessing || isRecordingRef.current) return;

        haptic.light();
        setActiveMode('calis');
        setSentence({
            word: item.word,
            meaning_tr: item.meaning_tr,
            example_en: item.example_en,
            example_tr: item.example_tr,
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
    }, [isProcessing]);

    // 🔊 Cümleyi seslendir
    const handleSpeakSentence = useCallback(() => {
        if (!sentence?.example_en) return;
        haptic.medium();
        sound.speakSentence(sentence.example_en, 'en-US');
    }, [sentence]);

    // Geri - Güçlendirilmiş navigasyon (DailyQuestsPanel'den gelse de çalışır)
    const handleBack = useCallback(() => {
        haptic.medium();
        
        // Önce goBack dene, eğer çalışmazsa Home'a git
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
    }, [navigation]);

    // Loading
    if (!sentence) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.accent} />
                <Text style={styles.loadingText}>Yükleniyor...</Text>
            </View>
        );
    }

    const allFilled = filledWords.size === sentenceWords.length;
    const allCorrect = allFilled && Array.from(filledWords.values()).every(v => v.isCorrect);

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

                    {/* Mod Seçici */}
                    <View style={styles.modeSelector}>
                        <TouchableOpacity
                            style={[
                                styles.modeTab,
                                activeMode === 'calis' && styles.modeTabActive,
                            ]}
                            onPress={() => {
                                haptic.light();
                                setActiveMode('calis');
                            }}
                        >
                            <BookOpen size={16} color={activeMode === 'calis' ? '#FFFFFF' : COLORS.textMuted} />
                            <Text style={[
                                styles.modeTabText,
                                activeMode === 'calis' && styles.modeTabTextActive,
                            ]}>Çalış</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.modeTab,
                                activeMode === 'tarla' && styles.modeTabActive,
                                activeMode === 'tarla' && { backgroundColor: '#22C55E' },
                            ]}
                            onPress={() => {
                                haptic.light();
                                setActiveMode('tarla');
                            }}
                        >
                            <Wheat size={16} color={activeMode === 'tarla' ? '#FFFFFF' : COLORS.textMuted} />
                            <Text style={[
                                styles.modeTabText,
                                activeMode === 'tarla' && styles.modeTabTextActive,
                            ]}>Tarla</Text>
                        </TouchableOpacity>
                    </View>

                    {/* İlerleme - sadece çalış modunda */}
                    {activeMode === 'calis' && (
                        <View style={styles.progressRow}>
                            <Text style={styles.progressText}>Soru {questionCount + 1}</Text>
                            {combo > 0 && (
                                <View style={styles.comboBadge}>
                                    <Text style={styles.comboText}>🔥 {combo}x</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Ana içerik - Çalış modu */}
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
                            {/* Hedef kelime kartı */}
                            <View style={styles.targetCard}>
                                <LinearGradient
                                    colors={['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.05)']}
                                    style={styles.targetCardGradient}
                                >
                                    <Text style={styles.targetLabel}>📚 Öğren:</Text>
                                    <Text style={styles.targetWord}>{sentence.word}</Text>
                                    <Text style={styles.targetMeaning}>{sentence.meaning_tr}</Text>
                                </LinearGradient>
                            </View>

                            {/* Cümle alanı - Yapboz tarzı slot'lar */}
                            <View style={styles.sentenceArea}>
                                <Text style={styles.sentenceLabel}>🎯 Bu cümleyi söyle:</Text>

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

                                <Text style={styles.translationHint}>
                                    💡 {sentence.example_tr}
                                </Text>
                            </View>

                            {/* Mikrofon veya sonuç butonları */}
                            <View style={styles.actionArea}>
                                {/* Söylediğin */}
                                {transcript ? (
                                    <View style={styles.transcriptBox}>
                                        <Text style={styles.transcriptLabel}>🗣️ Sen:</Text>
                                        <Text style={styles.transcriptText}>"{transcript}"</Text>
                                    </View>
                                ) : null}

                                {isComplete ? (
                                    <View style={styles.resultArea}>
                                        {/* Sonuç gösterimi */}
                                        <View style={[
                                            styles.resultBadge,
                                            { backgroundColor: allCorrect ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)' }
                                        ]}>
                                            <Text style={styles.resultEmoji}>
                                                {allCorrect ? '🎉' : '💪'}
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

                                            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                                                <LinearGradient
                                                    colors={['#22C55E', '#16A34A']}
                                                    style={styles.nextButtonGradient}
                                                >
                                                    <Text style={styles.nextButtonText}>Sonraki</Text>
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
                        /* Tarla modu - Geçmiş cümleler */
                        <ScrollView style={styles.tarlaContent} contentContainerStyle={styles.tarlaContentContainer}>
                            <View style={styles.tarlaHeader}>
                                <Text style={styles.tarlaTitle}>🌾 Senin Tarlan</Text>
                                <Text style={styles.tarlaSubtitle}>
                                    {sesyapHistory.length === 0
                                        ? 'Henüz çalıştığın cümle yok'
                                        : `${sesyapHistory.filter(h => h.correct).length} meyve · ${sesyapHistory.filter(h => !h.correct).length} tohum`
                                    }
                                </Text>
                            </View>

                            {sesyapHistory.length === 0 ? (
                                <View style={styles.tarlaEmpty}>
                                    <Text style={styles.tarlaEmptyEmoji}>🌱</Text>
                                    <Text style={styles.tarlaEmptyText}>Çalış modunda pratik yap,</Text>
                                    <Text style={styles.tarlaEmptyText}>tarlan dolsun!</Text>
                                </View>
                            ) : (
                                <View style={styles.tarlaGrid}>
                                    {sesyapHistory.map((item, index) => (
                                        <TouchableOpacity
                                            key={`${item.word}-${index}`}
                                            style={[
                                                styles.tarlaItem,
                                                { backgroundColor: item.correct ? 'rgba(34, 197, 94, 0.15)' : 'rgba(249, 115, 22, 0.15)' }
                                            ]}
                                            onPress={() => {
                                                openTarlaSentence(item);
                                            }}
                                        >
                                            <Text style={styles.tarlaItemIcon}>
                                                {item.correct ? '🍎' : '🌱'}
                                            </Text>
                                            <Text style={styles.tarlaItemWord} numberOfLines={1}>
                                                {item.word}
                                            </Text>
                                            <Text style={styles.tarlaItemMeaning} numberOfLines={1}>
                                                {item.meaning_tr}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                        </ScrollView>
                    )}
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

    // Çalış modu ScrollView
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
        paddingBottom: IS_SMALL_DEVICE ? 100 : 120, // Navbar için daha fazla alan
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

    // Mod seçici
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
    modeTabText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    modeTabTextActive: {
        color: '#FFFFFF',
    },

    // Tarla modu
    tarlaContent: {
        flex: 1,
    },
    tarlaContentContainer: {
        paddingHorizontal: 16,
        paddingBottom: 120,
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
        justifyContent: 'flex-start',
        gap: 10,
    },
    tarlaItem: {
        width: (SCREEN_WIDTH - 52) / 3,
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    tarlaItemIcon: {
        fontSize: 28,
        marginBottom: 6,
    },
    tarlaItemWord: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.text,
        textAlign: 'center',
    },
    tarlaItemMeaning: {
        fontSize: 11,
        color: COLORS.textMuted,
        textAlign: 'center',
        marginTop: 2,
    },
});
