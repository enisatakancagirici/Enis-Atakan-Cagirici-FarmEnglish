/**
 * 📚 YDSWordFormsScreen - YDS Kelime Formları Quiz Ekranı
 * 
 * 160+ profesyonel word forms sorusu
 * concern → concerned/concerning gibi morfolojik dönüşümler
 * B2-C1 seviye, Türkçe açıklamalar, suffix bilgisi
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    ScrollView,
    Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
    ChevronLeft,
    RotateCcw,
    Star,
    Sparkles,
    BookOpen,
    Check,
    X,
    SkipForward,
    Lightbulb,
    Trophy,
    Zap,
    Target,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import { haptic, sound } from '../utils/sound';
import { useFarmStore } from '../store/farmStore';
import { updatePracticeScore } from '../utils/firebaseBattle';

// Word Forms Veri kaynağı
import wordFormsData from '../../assets/data/yds_word_forms.json';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_SMALL_DEVICE = SCREEN_HEIGHT < 700;
const IS_VERY_SMALL = SCREEN_HEIGHT < 620;
const IS_TABLET = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) >= 600;
const SESSION_SIZE = 5;

// 🎨 Word Forms Renk paleti (akademik yeşil-mavi tema)
const COLORS = {
    background: '#0F172A',
    surface: 'rgba(30, 41, 59, 0.95)',
    accent: '#10B981',       // Yeşil - Word Forms tema
    accentLight: '#34D399',
    accentDark: '#059669',
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F59E0B',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    border: 'rgba(148, 163, 184, 0.3)',
    b2: '#3B82F6',           // Mavi - B2 seviye
    c1: '#8B5CF6',           // Mor - C1 seviye
    categoryNounAdj: '#F59E0B',
    categoryAdjNoun: '#EC4899',
    categoryVerbNoun: '#10B981',
    categoryVerbAdj: '#3B82F6',
    categoryAdjAdv: '#8B5CF6',
    categoryComplex: '#EF4444',
};

// Kategori renk haritası
const CATEGORY_COLORS: Record<string, string> = {
    'noun_to_adjective': COLORS.categoryNounAdj,
    'adjective_to_noun': COLORS.categoryAdjNoun,
    'verb_to_noun': COLORS.categoryVerbNoun,
    'verb_to_adjective': COLORS.categoryVerbAdj,
    'adjective_to_adverb': COLORS.categoryAdjAdv,
    'complex_transformation': COLORS.categoryComplex,
};

// Kategori etiketleri
const CATEGORY_LABELS: Record<string, string> = {
    'noun_to_adjective': 'İsim → Sıfat',
    'adjective_to_noun': 'Sıfat → İsim',
    'verb_to_noun': 'Fiil → İsim',
    'verb_to_adjective': 'Fiil → Sıfat',
    'adjective_to_adverb': 'Sıfat → Zarf',
    'complex_transformation': 'Kompleks',
};

interface WordFormQuestion {
    id: number;
    level: string;
    category: string;
    root_word: string;
    question: string;
    options: string[];
    answer: string;
    explanation: string;
}

// Soruları karıştır
function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Tüm Word Forms sorularını hazırla - 4 şık ve rastgele dağılım
function getAllQuestions(): WordFormQuestion[] {
    const questions = shuffleArray(wordFormsData.questions as WordFormQuestion[]);
    
    // Her sorunun şıklarını 4'e indir ve rastgele karıştır
    return questions.map(q => {
        const answer = q.answer;
        const otherOptions = q.options.filter(opt => opt !== answer);
        
        // 3 yanlış + 1 doğru = 4 şık
        const shuffledWrong = shuffleArray(otherOptions).slice(0, 3);
        const newOptions = shuffleArray([...shuffledWrong, answer]);
        
        return { ...q, options: newOptions };
    });
}

function decodeMojibake(text: string): string {
    try {
        return decodeURIComponent(escape(text));
    } catch {
        return text;
    }
}

function inferWordFormStrategy(question: WordFormQuestion): string {
    const answer = question.answer.toLowerCase();

    if (answer.endsWith('ly')) {
        return 'Bu boşluk büyük olasılıkla zarf ister; `-ly` son eki güçlü bir sinyaldir.';
    }
    if (answer.endsWith('tion') || answer.endsWith('sion') || answer.endsWith('ment') || answer.endsWith('ness')) {
        return 'Cümlede isim pozisyonu var; noun yapan son ekleri kontrol et.';
    }
    if (answer.endsWith('ive') || answer.endsWith('al') || answer.endsWith('ous') || answer.endsWith('able') || answer.endsWith('ic')) {
        return 'Cümle bir niteleme bekliyor; adjective form seçimi daha güçlü.';
    }
    if (answer.startsWith('un') || answer.startsWith('in') || answer.startsWith('im') || answer.startsWith('ir') || answer.startsWith('dis')) {
        return 'Anlam olumsuz yöne kayıyor; negatif ön ekleri (`un-`, `in-`, `dis-`) kontrol et.';
    }
    if (question.category === 'complex_transformation') {
        return 'Kompleks dönüşüm sorusu: önce kelime türünü, sonra anlam yönünü doğrula.';
    }

    return 'Kök kelimeyi bul, cümledeki pozisyona göre kelime türünü seç, sonra anlam uygunluğunu test et.';
}

function buildWordFormExplanation(
    question: WordFormQuestion,
    selectedOption: string | null,
    isCorrect: boolean | null
): string {
    const selectionLine = isCorrect
        ? `Seçimin doğru: "${question.answer}".`
        : selectedOption
            ? `Doğru cevap "${question.answer}". Sen "${selectedOption}" seçtin.`
            : `Doğru cevap "${question.answer}".`;

    const sourceExplanation = decodeMojibake(question.explanation || '').trim();
    const categoryLabel = CATEGORY_LABELS[question.category] || question.category;

    return [
        selectionLine,
        `Kategori: ${categoryLabel} | Kök: ${question.root_word}`,
        `Sınav ipucu: ${inferWordFormStrategy(question)}`,
        sourceExplanation ? `Detay: ${sourceExplanation}` : '',
    ].filter(Boolean).join('\n');
}

// 🔘 Seçenek Butonu
interface OptionButtonProps {
    option: string;
    index: number;
    isSelected: boolean;
    isCorrect: boolean | null;
    correctAnswer: string;
    onPress: () => void;
    disabled: boolean;
}

const OptionButton: React.FC<OptionButtonProps> = ({ 
    option, 
    index,
    isSelected, 
    isCorrect, 
    correctAnswer,
    onPress, 
    disabled 
}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const letters = ['A', 'B', 'C', 'D'];

    useEffect(() => {
        if (isSelected && isCorrect !== null) {
            if (isCorrect) {
                // Doğru cevap - bounce
                Animated.sequence([
                    Animated.spring(scaleAnim, { toValue: 1.08, useNativeDriver: true, friction: 3, tension: 200 }),
                    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5 }),
                ]).start();
            } else {
                // Yanlış cevap - shake
                Animated.sequence([
                    Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
                ]).start();
            }
        }
    }, [isSelected, isCorrect]);

    const getButtonStyle = () => {
        // Doğru cevabı her zaman yeşil göster (cevaplandıktan sonra)
        if (disabled && option === correctAnswer) {
            return { backgroundColor: 'rgba(34, 197, 94, 0.3)', borderColor: COLORS.success };
        }
        // Seçilen yanlış cevap kırmızı
        if (isCorrect === false && isSelected) {
            return { backgroundColor: 'rgba(239, 68, 68, 0.3)', borderColor: COLORS.error };
        }
        // Seçilen doğru cevap yeşil
        if (isCorrect === true) {
            return { backgroundColor: 'rgba(34, 197, 94, 0.3)', borderColor: COLORS.success };
        }
        // Normal durum
        return { backgroundColor: 'rgba(30, 41, 59, 0.8)', borderColor: COLORS.border };
    };

    return (
        <Animated.View style={{ 
            transform: [
                { scale: scaleAnim },
                { translateX: shakeAnim }
            ] 
        }}>
            <TouchableOpacity
                style={[styles.optionButton, getButtonStyle()]}
                onPress={onPress}
                disabled={disabled}
                activeOpacity={0.7}
            >
                <View style={[
                    styles.optionLetter,
                    (isCorrect === true || (disabled && option === correctAnswer)) && { backgroundColor: 'rgba(34, 197, 94, 0.3)' },
                    isCorrect === false && isSelected && { backgroundColor: 'rgba(239, 68, 68, 0.3)' },
                ]}>
                    <Text style={[
                        styles.optionLetterText,
                        (isCorrect === true || (disabled && option === correctAnswer)) && { color: COLORS.success },
                        isCorrect === false && isSelected && { color: COLORS.error },
                    ]}>
                        {letters[index]}
                    </Text>
                </View>
                <Text 
                    style={[
                        styles.optionText,
                        (isCorrect === true || (disabled && option === correctAnswer)) && { color: COLORS.success, fontWeight: '700' },
                        isCorrect === false && isSelected && { color: COLORS.error },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    {option}
                </Text>
                {(isCorrect === true || (disabled && option === correctAnswer)) && (
                    <Check size={20} color={COLORS.success} strokeWidth={3} />
                )}
                {isCorrect === false && isSelected && <X size={20} color={COLORS.error} strokeWidth={3} />}
            </TouchableOpacity>
        </Animated.View>
    );
};

// 🎮 Ana Ekran
export default function YDSWordFormsScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    
    // Store
    const addCoins = useFarmStore(state => state.addCoins);
    const updateQuestProgress = useFarmStore(state => state.updateQuestProgress);
    const user = useFarmStore(state => state.user);

    // State
    const [questions, setQuestions] = useState<WordFormQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [totalCorrect, setTotalCorrect] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [quizFinished, setQuizFinished] = useState(false);
    const allQuestionsRef = useRef<WordFormQuestion[]>([]);
    const sessionStartRef = useRef(0);

    // Animasyonlar
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const comboScaleAnim = useRef(new Animated.Value(1)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Başlangıç
    useEffect(() => {
        const allQuestions = getAllQuestions();
        allQuestionsRef.current = allQuestions;
        sessionStartRef.current = 0;
        setQuestions(allQuestions.slice(0, SESSION_SIZE));
        animateIn();
    }, []);

    // Combo pulse animasyonu
    useEffect(() => {
        if (combo >= 3) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.1, duration: 500, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [combo]);

    const animateIn = () => {
        fadeAnim.setValue(0);
        slideAnim.setValue(30);
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 8 }),
        ]).start();
    };

    const currentQuestion = questions[currentIndex];

    // Cevap kontrolü
    const handleOptionPress = useCallback((option: string) => {
        if (selectedOption !== null) return;

        // 📳 COMBO'YA GÖRE PREMIUM HAPTİC
        if (combo >= 7) {
            // LEGENDARY combo - ultra premium
            haptic.rigid();
            haptic.heavy();
            setTimeout(() => haptic.medium(), 30);
        } else if (combo >= 5) {
            // EPIC combo - premium
            haptic.heavy();
            setTimeout(() => haptic.medium(), 25);
        } else if (combo >= 3) {
            // SUPER combo
            haptic.medium();
            setTimeout(() => haptic.light(), 20);
        } else {
            haptic.light();
        }
        
        setSelectedOption(option);
        
        const correct = option === currentQuestion.answer;
        setIsCorrect(correct);
        setShowResult(true);

        if (correct) {
            // 🎉 DOĞRU CEVAP - Premium haptic cascade
            const newCombo = combo + 1;
            
            if (newCombo >= 7) {
                // LEGENDARY
                haptic.masterCelebration();
            } else if (newCombo >= 5) {
                // EPIC
                haptic.rigid();
                setTimeout(() => {
                    haptic.heavy();
                    haptic.success();
                }, 50);
            } else if (newCombo >= 3) {
                // SUPER
                haptic.heavy();
                haptic.success();
            } else {
                haptic.success();
            }
            
            sound.playCorrect();
            setTotalCorrect(prev => prev + 1);
            setCombo(newCombo);
            setMaxCombo(prev => Math.max(prev, newCombo));
            
            // Combo scale animasyonu
            Animated.sequence([
                Animated.spring(comboScaleAnim, { toValue: 1.4, useNativeDriver: true, friction: 3 }),
                Animated.spring(comboScaleAnim, { toValue: 1, useNativeDriver: true, friction: 5 }),
            ]).start();
            
            // Puan hesapla
            // Base: 5 puan
            // Seviye bonusu: C1 = +3
            // Kategori bonusu: Complex = +2
            // Combo bonusu: combo * 2
            const levelBonus = currentQuestion.level === 'C1' ? 3 : 0;
            const categoryBonus = currentQuestion.category === 'complex_transformation' ? 2 : 0;
            const comboBonus = Math.min(combo * 2, 14); // Max 14
            const basePoints = 5 + levelBonus + categoryBonus + comboBonus;
            setScore(prev => prev + basePoints);
            
            // Ödül
            const coinReward = newCombo >= 5 ? 4 : newCombo >= 3 ? 3 : 2;
            addCoins(coinReward);
            updateQuestProgress('YDS_QUIZ', 1);
            
            // 📊 FIREBASE'E SKOR YAZ
            if (user?.odId) {
                updatePracticeScore(user.odId, 'wordforms', basePoints);
            }
        } else {
            // ❌ YANLIŞ CEVAP - Premium error haptic
            haptic.error();
            setTimeout(() => haptic.medium(), 50);
            sound.playWrong();
            setCombo(0);
        }
    }, [selectedOption, currentQuestion, combo, addCoins, updateQuestProgress, user]);

    // Sonraki soru
    const handleNext = useCallback(() => {
        haptic.medium();
        
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
            setIsCorrect(null);
            setShowResult(false);
            animateIn();
        } else {
            // Quiz bitti - Premium celebration
            haptic.masterCelebration();
            sound.playHarvest();
            setQuizFinished(true);
        }
    }, [currentIndex, questions.length]);

    // Geri
    const handleBack = useCallback(() => {
        haptic.light();
        navigation.goBack();
    }, [navigation]);

    // Yeniden başlat
    const handleRestart = useCallback(() => {
        haptic.medium();
        const start = sessionStartRef.current;
        setQuestions(allQuestionsRef.current.slice(start, start + SESSION_SIZE));
        setCurrentIndex(0);
        setScore(0);
        setCombo(0);
        setMaxCombo(0);
        setTotalCorrect(0);
        setSelectedOption(null);
        setIsCorrect(null);
        setShowResult(false);
        setQuizFinished(false);
        animateIn();
    }, []);

    const handleContinue = useCallback(() => {
        haptic.medium();
        let nextStart = sessionStartRef.current + SESSION_SIZE;
        if (nextStart >= allQuestionsRef.current.length) {
            const allQuestions = getAllQuestions();
            allQuestionsRef.current = allQuestions;
            nextStart = 0;
        }
        sessionStartRef.current = nextStart;
        setQuestions(allQuestionsRef.current.slice(nextStart, nextStart + SESSION_SIZE));
        setCurrentIndex(0);
        setScore(0);
        setCombo(0);
        setMaxCombo(0);
        setTotalCorrect(0);
        setSelectedOption(null);
        setIsCorrect(null);
        setShowResult(false);
        setQuizFinished(false);
        animateIn();
    }, []);

    // Cümleyi render et (boşluk ile)
    const renderQuestion = () => {
        if (!currentQuestion) return null;
        
        const parts = currentQuestion.question.split('________');
        
        return (
            <Text style={styles.questionText}>
                {parts[0]}
                <Text style={[
                    styles.blankText,
                    isCorrect === true && { color: COLORS.success, backgroundColor: 'rgba(34, 197, 94, 0.2)' },
                    isCorrect === false && { color: COLORS.error, backgroundColor: 'rgba(239, 68, 68, 0.2)' },
                ]}>
                    {selectedOption ? ` ${selectedOption} ` : ' ________ '}
                </Text>
                {parts[1]}
            </Text>
        );
    };

    // Combo göstergesi
    const renderComboIndicator = () => {
        if (combo < 2) return null;
        
        let comboText = '';
        let comboColor = COLORS.warning;
        let comboEmoji = '🔥';
        
        if (combo >= 7) {
            comboText = 'LEGENDARY!';
            comboColor = '#FFD700';
            comboEmoji = '👑';
        } else if (combo >= 5) {
            comboText = 'EPIC!';
            comboColor = '#A855F7';
            comboEmoji = '⚡';
        } else if (combo >= 3) {
            comboText = 'SUPER!';
            comboColor = '#F97316';
            comboEmoji = '🔥';
        } else {
            comboText = 'COMBO';
            comboColor = COLORS.warning;
            comboEmoji = '✨';
        }
        
        return (
            <Animated.View style={[
                styles.comboIndicator,
                { 
                    backgroundColor: `${comboColor}20`,
                    borderColor: comboColor,
                    transform: [{ scale: comboScaleAnim }]
                }
            ]}>
                <Animated.Text style={[
                    styles.comboText,
                    { color: comboColor, transform: [{ scale: pulseAnim }] }
                ]}>
                    {comboEmoji} {combo}x {comboText}
                </Animated.Text>
            </Animated.View>
        );
    };

    // Quiz Sonuç Ekranı
    if (quizFinished) {
        const percentage = Math.round((totalCorrect / questions.length) * 100);
        const grade = percentage >= 90 ? 'A+' : 
                     percentage >= 80 ? 'A' : 
                     percentage >= 70 ? 'B' : 
                     percentage >= 60 ? 'C' : 
                     percentage >= 50 ? 'D' : 'F';
        
        const gradeColors: Record<string, string> = {
            'A+': '#FFD700',
            'A': '#22C55E',
            'B': '#3B82F6',
            'C': '#F59E0B',
            'D': '#F97316',
            'F': '#EF4444',
        };
        
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={['#0F172A', '#065F46', '#0F172A']}
                    style={styles.gradient}
                >
                    <SafeAreaView style={styles.safeArea}>
                        <View style={styles.resultContainer}>
                            <BookOpen size={70} color={COLORS.accent} />
                            <Text style={styles.resultTitle}>Quiz Tamamlandı!</Text>
                            <Text style={styles.resultSubtitle}>Kelime Formları</Text>
                            
                            <View style={[styles.gradeCircle, { borderColor: gradeColors[grade] }]}>
                                <Text style={[styles.gradeText, { color: gradeColors[grade] }]}>{grade}</Text>
                            </View>
                            
                            <View style={styles.statsContainer}>
                                <View style={styles.statItem}>
                                    <Trophy size={24} color={COLORS.warning} />
                                    <Text style={styles.statValue}>{score}</Text>
                                    <Text style={styles.statLabel}>Puan</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Check size={24} color={COLORS.success} />
                                    <Text style={styles.statValue}>{totalCorrect}/{questions.length}</Text>
                                    <Text style={styles.statLabel}>Doğru</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Zap size={24} color="#F97316" />
                                    <Text style={styles.statValue}>{maxCombo}x</Text>
                                    <Text style={styles.statLabel}>Max Combo</Text>
                                </View>
                            </View>
                            
                            <TouchableOpacity style={styles.restartFullButton} onPress={handleRestart}>
                                <LinearGradient
                                    colors={[COLORS.accent, COLORS.accentDark]}
                                    style={styles.restartGradient}
                                >
                                    <RotateCcw size={20} color="#FFFFFF" />
                                    <Text style={styles.restartText}>Tekrar Dene</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.continueFullButton} onPress={handleContinue}>
                                <LinearGradient
                                    colors={['#22C55E', '#16A34A']}
                                    style={styles.continueGradient}
                                >
                                    <SkipForward size={20} color="#FFFFFF" />
                                    <Text style={styles.continueText}>Devam Et</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                            
                            <TouchableOpacity style={styles.backFullButton} onPress={handleBack}>
                                <Text style={styles.backButtonText}>Ana Menüye Dön</Text>
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </LinearGradient>
            </View>
        );
    }

    if (!currentQuestion) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={styles.loadingText}>Yükleniyor...</Text>
            </View>
        );
    }

    const progress = ((currentIndex + 1) / questions.length) * 100;
    const categoryColor = CATEGORY_COLORS[currentQuestion.category] || COLORS.accent;
    const categoryLabel = CATEGORY_LABELS[currentQuestion.category] || 'Dönüşüm';

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0F172A', '#065F46', '#0F172A']}
                style={styles.gradient}
            >
                <SafeAreaView style={styles.safeArea}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                            <ChevronLeft size={28} color={COLORS.text} />
                        </TouchableOpacity>

                        <View style={styles.headerCenter}>
                            <BookOpen size={18} color={COLORS.accent} />
                            <Text style={styles.headerTitle}>Kelime Formları</Text>
                        </View>

                        <View style={styles.scoreContainer}>
                            <Star size={14} color="#FBBF24" fill="#FBBF24" />
                            <Text style={styles.scoreText}>{score}</Text>
                        </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <Animated.View style={[
                                styles.progressFill, 
                                { width: `${progress}%`, backgroundColor: COLORS.accent }
                            ]} />
                        </View>
                        <Text style={styles.progressText}>
                            {currentIndex + 1} / {questions.length}
                        </Text>
                    </View>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <View style={styles.statBadge}>
                            <Text style={styles.statBadgeText}>✅ {totalCorrect}</Text>
                        </View>
                        
                        {renderComboIndicator()}
                        
                        <View style={[
                            styles.statBadge, 
                            { backgroundColor: currentQuestion.level === 'C1' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(59, 130, 246, 0.2)' }
                        ]}>
                            <Text style={[
                                styles.statBadgeText, 
                                { color: currentQuestion.level === 'C1' ? COLORS.c1 : COLORS.b2 }
                            ]}>
                                🎓 {currentQuestion.level}
                            </Text>
                        </View>
                    </View>

                    {/* Ana İçerik */}
                    <ScrollView 
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <Animated.View 
                            style={[
                                styles.content,
                                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                            ]}
                        >
                            {/* Soru Kartı */}
                            <View style={[styles.questionCard, { borderColor: `${categoryColor}40` }]}>
                                <View style={styles.questionHeader}>
                                    <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}20` }]}>
                                        <Text style={[styles.categoryText, { color: categoryColor }]}>
                                            {categoryLabel}
                                        </Text>
                                    </View>
                                </View>
                                {renderQuestion()}
                            </View>

                            {/* Seçenekler */}
                            <View style={styles.optionsContainer}>
                                {currentQuestion.options.map((option, index) => (
                                    <OptionButton
                                        key={`${option}-${index}`}
                                        option={option}
                                        index={index}
                                        isSelected={selectedOption === option}
                                        isCorrect={selectedOption === option ? isCorrect : null}
                                        correctAnswer={currentQuestion.answer}
                                        onPress={() => handleOptionPress(option)}
                                        disabled={selectedOption !== null}
                                    />
                                ))}
                            </View>

                            {/* Açıklama */}
                            {showResult && (
                                <View style={[
                                    styles.explanationCard,
                                    { borderColor: isCorrect ? COLORS.success : COLORS.warning }
                                ]}>
                                    <View style={styles.explanationHeader}>
                                        <Lightbulb size={20} color={isCorrect ? COLORS.success : COLORS.warning} />
                                        <Text style={[
                                            styles.explanationTitle,
                                            { color: isCorrect ? COLORS.success : COLORS.warning }
                                        ]}>
                                            {isCorrect ? 'Mükemmel!' : 'Çözüm'}
                                        </Text>
                                    </View>
                                    <Text style={styles.explanationText}>
                                        {buildWordFormExplanation(currentQuestion, selectedOption, isCorrect)}
                                    </Text>
                                    {!isCorrect && (
                                        <View style={styles.correctAnswerRow}>
                                            <Check size={16} color={COLORS.success} />
                                            <Text style={styles.correctAnswerText}>
                                                Doğru cevap: <Text style={{ fontWeight: '700' }}>{currentQuestion.answer}</Text>
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </Animated.View>
                    </ScrollView>

                    {/* Alt Butonlar */}
                    <View style={[
                        styles.bottomBar,
                        { 
                            paddingBottom: Math.max(insets.bottom, IS_SMALL_DEVICE ? 12 : 16),
                            marginBottom: IS_SMALL_DEVICE ? 60 : 70
                        }
                    ]}>
                        <TouchableOpacity style={styles.restartButton} onPress={handleRestart}>
                            <RotateCcw size={IS_SMALL_DEVICE ? 18 : 20} color={COLORS.textMuted} />
                        </TouchableOpacity>

                        {selectedOption !== null && (
                            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                                <LinearGradient
                                    colors={[COLORS.accent, COLORS.accentDark]}
                                    style={styles.nextButtonGradient}
                                >
                                    <Text style={styles.nextButtonText}>
                                        {currentIndex < questions.length - 1 ? 'Sonraki' : 'Bitir'}
                                    </Text>
                                    <SkipForward size={IS_SMALL_DEVICE ? 16 : 18} color="#FFFFFF" />
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                    </View>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(251, 191, 36, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    scoreText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FBBF24',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        gap: 12,
    },
    progressBar: {
        flex: 1,
        height: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textMuted,
        minWidth: 50,
        textAlign: 'right',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 20,
        paddingVertical: 12,
        flexWrap: 'wrap',
    },
    statBadge: {
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statBadgeText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.success,
    },
    comboIndicator: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 14,
        borderWidth: 2,
    },
    comboText: {
        fontSize: 14,
        fontWeight: '800',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    content: {
        gap: 16,
    },
    questionCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
    },
    questionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 10,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: '700',
    },
    rootWordBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(148, 163, 184, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    rootWordText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textMuted,
        fontStyle: 'italic',
    },
    questionText: {
        fontSize: IS_SMALL_DEVICE ? 16 : 18,
        fontWeight: '500',
        color: COLORS.text,
        lineHeight: IS_SMALL_DEVICE ? 26 : 30,
    },
    blankText: {
        color: COLORS.accent,
        fontWeight: '700',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        paddingHorizontal: 4,
        borderRadius: 4,
    },
    optionsContainer: {
        gap: 10,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 14,
        borderWidth: 2,
        gap: 12,
    },
    optionLetter: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionLetterText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.accent,
    },
    optionText: {
        flex: 1,
        fontSize: IS_SMALL_DEVICE ? 15 : 17,
        fontWeight: '600',
        color: COLORS.text,
    },
    explanationCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 2,
        borderLeftWidth: 4,
    },
    explanationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    explanationTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    explanationText: {
        fontSize: 14,
        color: COLORS.text,
        lineHeight: 22,
    },
    correctAnswerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(148, 163, 184, 0.2)',
    },
    correctAnswerText: {
        fontSize: 14,
        color: COLORS.success,
    },
    bottomBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 12,
        gap: 12,
    },
    restartButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    nextButton: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
    },
    nextButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: IS_SMALL_DEVICE ? 14 : 16,
    },
    nextButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    loadingText: {
        fontSize: 18,
        color: COLORS.textMuted,
    },
    // Result Screen Styles
    resultContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
        gap: 16,
    },
    resultTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: COLORS.text,
        marginTop: 16,
    },
    resultSubtitle: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.textMuted,
    },
    gradeCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderWidth: 4,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 10,
    },
    gradeText: {
        fontSize: 40,
        fontWeight: '900',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 30,
        marginVertical: 20,
    },
    statItem: {
        alignItems: 'center',
        gap: 6,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '800',
        color: COLORS.text,
    },
    statLabel: {
        fontSize: 13,
        color: COLORS.textMuted,
    },
    restartFullButton: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 20,
    },
    restartGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 16,
    },
    restartText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    continueFullButton: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 12,
    },
    continueGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 16,
    },
    continueText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    backFullButton: {
        paddingVertical: 14,
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
});
