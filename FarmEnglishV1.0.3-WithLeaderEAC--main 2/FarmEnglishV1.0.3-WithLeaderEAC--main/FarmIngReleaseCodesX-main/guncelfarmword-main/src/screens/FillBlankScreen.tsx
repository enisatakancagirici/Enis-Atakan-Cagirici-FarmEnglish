/**
 * 📝 FillBlankScreen - Boşluk Doldurma Ekranı
 * 
 * Cümle gösterilir, boşluk yerine 3-4 seçenek sunulur.
 * Preposition (at, in, on) ve diğer gramer konularını pratik et.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    ScrollView,
    Platform,
    Alert,
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
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import { haptic, sound } from '../utils/sound';
import { useFarmStore } from '../store/farmStore';
import { updatePracticeScore } from '../utils/firebaseBattle';

// Veri kaynağı
import prepositionsData from '../../assets/data/prepositions.json';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_SMALL_DEVICE = SCREEN_HEIGHT < 700;
const IS_VERY_SMALL = SCREEN_HEIGHT < 620;
const IS_TABLET = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) >= 600;
const SESSION_SIZE = 5;

// 🎨 Renk paleti
const COLORS = {
    background: '#0F172A',
    surface: 'rgba(30, 41, 59, 0.95)',
    accent: '#10B981',
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F59E0B',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    border: 'rgba(148, 163, 184, 0.3)',
};

interface Question {
    sentence: string;
    correct: string;
    options: string[];
    tr: string;
    category: string;
    usage: string;
}

// Tüm soruları hazırla
function getAllQuestions(): Question[] {
    const questions: Question[] = [];
    
    prepositionsData.prepositions.forEach(prep => {
        prep.examples.forEach(example => {
            questions.push({
                sentence: example.sentence,
                correct: example.correct,
                options: shuffleArray([...example.options]),
                tr: example.tr,
                category: prep.category,
                usage: prep.usage,
            });
        });
    });
    
    return shuffleArray(questions);
}

function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// 🔘 Seçenek Butonu
interface OptionButtonProps {
    option: string;
    isSelected: boolean;
    isCorrect: boolean | null;
    onPress: () => void;
    disabled: boolean;
}

const OptionButton: React.FC<OptionButtonProps> = ({ 
    option, 
    isSelected, 
    isCorrect, 
    onPress, 
    disabled 
}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (isSelected && isCorrect !== null) {
            Animated.sequence([
                Animated.spring(scaleAnim, { toValue: 1.1, useNativeDriver: true, friction: 4 }),
                Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5 }),
            ]).start();
        }
    }, [isSelected, isCorrect]);

    const getButtonStyle = () => {
        if (isCorrect === true) {
            return { backgroundColor: 'rgba(34, 197, 94, 0.3)', borderColor: COLORS.success };
        }
        if (isCorrect === false && isSelected) {
            return { backgroundColor: 'rgba(239, 68, 68, 0.3)', borderColor: COLORS.error };
        }
        if (isSelected) {
            return { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: COLORS.accent };
        }
        return { backgroundColor: 'rgba(30, 41, 59, 0.8)', borderColor: COLORS.border };
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={[styles.optionButton, getButtonStyle()]}
                onPress={onPress}
                disabled={disabled}
                activeOpacity={0.7}
            >
                <Text 
                    style={[
                        styles.optionText,
                        isCorrect === true && { color: COLORS.success },
                        isCorrect === false && isSelected && { color: COLORS.error },
                    ]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                >
                    {option}
                </Text>
                {isCorrect === true && <Check size={18} color={COLORS.success} />}
                {isCorrect === false && isSelected && <X size={18} color={COLORS.error} />}
            </TouchableOpacity>
        </Animated.View>
    );
};

// 🎮 Ana Ekran
export default function FillBlankScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    
    // Store
    const addCoins = useFarmStore(state => state.addCoins);
    const updateQuestProgress = useFarmStore(state => state.updateQuestProgress);
    const user = useFarmStore(state => state.user);

    // State
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [totalCorrect, setTotalCorrect] = useState(0);
    const [showExplanation, setShowExplanation] = useState(false);
    const allQuestionsRef = useRef<Question[]>([]);
    const sessionStartRef = useRef(0);

    // Animasyonlar
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    // Başlangıç
    useEffect(() => {
        const allQuestions = getAllQuestions();
        allQuestionsRef.current = allQuestions;
        sessionStartRef.current = 0;
        setQuestions(allQuestions.slice(0, SESSION_SIZE));
        animateIn();
    }, []);

    const animateIn = () => {
        fadeAnim.setValue(0);
        slideAnim.setValue(30);
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
    };

    const currentQuestion = questions[currentIndex];

    // Cevap kontrolü
    const handleOptionPress = useCallback((option: string) => {
        if (selectedOption !== null) return;

        // 📳 COMBO'YA GÖRE KUDURTMALI HAPTİC!
        if (combo >= 5) {
            haptic.heavy();
            haptic.medium();
        } else if (combo >= 3) {
            haptic.medium();
            haptic.light();
        } else {
            haptic.light();
        }
        
        setSelectedOption(option);
        
        const correct = option === currentQuestion.correct;
        setIsCorrect(correct);
        setShowExplanation(true);

        if (correct) {
            // 🎉 DOĞRU CEVAP - GÜÇLÜ KUTLAMA!
            if (combo >= 5) {
                haptic.rigid();
                haptic.heavy();
                haptic.success();
            } else if (combo >= 3) {
                haptic.heavy();
                haptic.success();
            } else {
                haptic.success();
            }
            sound.playCorrect();
            setTotalCorrect(prev => prev + 1);
            setCombo(prev => prev + 1);
            
            // Puan hesapla
            const basePoints = 3;
            const comboBonus = Math.floor(combo / 5);
            setScore(prev => prev + basePoints + comboBonus);
            
            // Ödül
            addCoins(1);
            updateQuestProgress('FILL_BLANK', 1);
            
            // 📊 FIREBASE'E SKOR YAZ (Leaderboard için)
            if (user?.odId) {
                updatePracticeScore(user.odId, 'fillblank', basePoints + comboBonus);
            }
        } else {
            // ❌ YANLIŞ CEVAP - GÜÇLÜ UYARI!
            haptic.error();
            haptic.medium();
            sound.playWrong();
            setCombo(0);
        }
    }, [selectedOption, currentQuestion, combo, addCoins, updateQuestProgress]);

    // Sonraki soru
    const handleNext = useCallback(() => {
        // 📳 AKICI GEÇİŞ HAPTİC
        haptic.medium();
        haptic.light();
        
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
            setIsCorrect(null);
            setShowExplanation(false);
            animateIn();
        } else {
            // Quiz bitti - MEGA KUTLAMA!
            haptic.masterCelebration();
            sound.playHarvest();

            Alert.alert(
                '5 Soru Bitti',
                'Ne yapmak istersin?',
                [
                    { text: 'Tekrar Dene', onPress: () => handleRestart() },
                    { text: 'Devam Et', onPress: () => handleContinue() },
                ],
            );
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
        setTotalCorrect(0);
        setSelectedOption(null);
        setIsCorrect(null);
        setShowExplanation(false);
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
        setTotalCorrect(0);
        setSelectedOption(null);
        setIsCorrect(null);
        setShowExplanation(false);
        animateIn();
    }, []);

    // Cümleyi parçalara ayır
    const renderSentence = () => {
        if (!currentQuestion) return null;
        
        const parts = currentQuestion.sentence.split('___');
        
        return (
            <Text style={styles.sentenceText}>
                {parts[0]}
                <Text style={[
                    styles.blankText,
                    isCorrect === true && { color: COLORS.success, backgroundColor: 'rgba(34, 197, 94, 0.2)' },
                    isCorrect === false && { color: COLORS.error, backgroundColor: 'rgba(239, 68, 68, 0.2)' },
                ]}>
                    {selectedOption ? ` ${selectedOption} ` : ' _____ '}
                </Text>
                {parts[1]}
            </Text>
        );
    };

    if (!currentQuestion) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={styles.loadingText}>Yükleniyor...</Text>
            </View>
        );
    }

    const progress = ((currentIndex + 1) / questions.length) * 100;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0F172A', '#064E3B', '#0F172A']}
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
                            <Text style={styles.headerTitle}>Boşluk Doldur</Text>
                        </View>

                        <View style={styles.scoreContainer}>
                            <Star size={14} color="#FBBF24" fill="#FBBF24" />
                            <Text style={styles.scoreText}>{score}</Text>
                        </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${progress}%` }]} />
                        </View>
                        <Text style={styles.progressText}>
                            {currentIndex + 1} / {questions.length}
                        </Text>
                    </View>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <View style={styles.statBadge}>
                            <Text style={styles.statText}>✅ {totalCorrect}</Text>
                        </View>
                        {combo > 0 && (
                            <View style={[styles.statBadge, { backgroundColor: 'rgba(249, 115, 22, 0.2)' }]}>
                                <Text style={[styles.statText, { color: '#F97316' }]}>🔥 {combo}x</Text>
                            </View>
                        )}
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
                            {/* Kategori */}
                            <View style={styles.categoryBadge}>
                                <Text style={styles.categoryText}>
                                    {currentQuestion.category === 'time' ? '⏰ Zaman' :
                                     currentQuestion.category === 'place' ? '📍 Yer' :
                                     currentQuestion.category === 'direction' ? '➡️ Yön' :
                                     currentQuestion.category === 'purpose' ? '🎯 Amaç' :
                                     currentQuestion.category === 'origin' ? '🏠 Kaynak' :
                                     currentQuestion.category === 'accompaniment' ? '👥 Birliktelik' :
                                     currentQuestion.category === 'means' ? '🚗 Araç' :
                                     currentQuestion.category === 'topic' ? '💬 Konu' :
                                     currentQuestion.category === 'position' ? '📐 Konum' :
                                     currentQuestion.category === 'absence' ? '❌ Yokluk' :
                                     '📚 Genel'}
                                </Text>
                            </View>

                            {/* Cümle Kartı */}
                            <View style={styles.sentenceCard}>
                                <LinearGradient
                                    colors={['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)']}
                                    style={styles.sentenceGradient}
                                >
                                    {renderSentence()}
                                </LinearGradient>
                            </View>

                            {/* Türkçe Çeviri */}
                            <Text style={styles.translationText}>
                                💡 {currentQuestion.tr}
                            </Text>

                            {/* Seçenekler */}
                            <View style={styles.optionsContainer}>
                                {currentQuestion.options.map((option, index) => (
                                    <OptionButton
                                        key={`${option}-${index}`}
                                        option={option}
                                        isSelected={selectedOption === option}
                                        isCorrect={selectedOption === option ? isCorrect : 
                                                  (showExplanation && option === currentQuestion.correct ? true : null)}
                                        onPress={() => handleOptionPress(option)}
                                        disabled={selectedOption !== null}
                                    />
                                ))}
                            </View>

                            {/* Açıklama */}
                            {showExplanation && (
                                <View style={[
                                    styles.explanationCard,
                                    { borderColor: isCorrect ? COLORS.success : COLORS.warning }
                                ]}>
                                    <Text style={styles.explanationTitle}>
                                        {isCorrect ? '✅ Doğru!' : '💡 Doğru cevap: ' + currentQuestion.correct}
                                    </Text>
                                    <Text style={styles.explanationText}>
                                        {currentQuestion.usage}
                                    </Text>
                                </View>
                            )}
                        </Animated.View>
                    </ScrollView>

                    {/* Alt Butonlar - Responsive */}
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
                                    colors={['#22C55E', '#16A34A']}
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
        paddingVertical: IS_SMALL_DEVICE ? 8 : 12,
    },
    backButton: {
        width: IS_SMALL_DEVICE ? 40 : 44,
        height: IS_SMALL_DEVICE ? 40 : 44,
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
        fontSize: IS_SMALL_DEVICE ? 16 : 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(251, 191, 36, 0.2)',
        paddingHorizontal: IS_SMALL_DEVICE ? 10 : 12,
        paddingVertical: IS_SMALL_DEVICE ? 4 : 6,
        borderRadius: 16,
    },
    scoreText: {
        fontSize: IS_SMALL_DEVICE ? 14 : 16,
        fontWeight: '700',
        color: '#FBBF24',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        gap: 12,
    },
    progressBar: {
        flex: 1,
        height: IS_SMALL_DEVICE ? 4 : 6,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.accent,
        borderRadius: 3,
    },
    progressText: {
        fontSize: IS_SMALL_DEVICE ? 10 : 12,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        paddingVertical: IS_SMALL_DEVICE ? 8 : 12,
    },
    statBadge: {
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        paddingHorizontal: IS_SMALL_DEVICE ? 10 : 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statText: {
        fontSize: IS_SMALL_DEVICE ? 11 : 12,
        fontWeight: '700',
        color: COLORS.success,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: IS_TABLET ? 40 : 16,
        paddingBottom: 20,
    },
    content: {
        gap: IS_SMALL_DEVICE ? 12 : 16,
    },
    categoryBadge: {
        alignSelf: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        paddingHorizontal: IS_SMALL_DEVICE ? 12 : 16,
        paddingVertical: IS_SMALL_DEVICE ? 4 : 6,
        borderRadius: 20,
    },
    categoryText: {
        fontSize: IS_SMALL_DEVICE ? 11 : 13,
        fontWeight: '600',
        color: COLORS.accent,
    },
    sentenceCard: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    sentenceGradient: {
        padding: IS_SMALL_DEVICE ? 16 : 24,
    },
    sentenceText: {
        fontSize: IS_VERY_SMALL ? 16 : IS_SMALL_DEVICE ? 18 : 22,
        fontWeight: '600',
        color: COLORS.text,
        textAlign: 'center',
        lineHeight: IS_SMALL_DEVICE ? 26 : 32,
    },
    blankText: {
        color: COLORS.accent,
        fontWeight: '800',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        paddingHorizontal: 8,
        borderRadius: 4,
    },
    translationText: {
        fontSize: IS_SMALL_DEVICE ? 12 : 14,
        color: COLORS.textMuted,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    optionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: IS_SMALL_DEVICE ? 8 : 12,
        marginTop: IS_SMALL_DEVICE ? 4 : 8,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: IS_SMALL_DEVICE ? 6 : 8,
        paddingHorizontal: IS_SMALL_DEVICE ? 18 : 24,
        paddingVertical: IS_SMALL_DEVICE ? 10 : 14,
        borderRadius: 16,
        borderWidth: 2,
        minWidth: IS_SMALL_DEVICE ? 80 : 100,
        justifyContent: 'center',
    },
    optionText: {
        fontSize: IS_SMALL_DEVICE ? 16 : 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    explanationCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        borderRadius: 12,
        padding: IS_SMALL_DEVICE ? 12 : 16,
        borderWidth: 1,
        marginTop: IS_SMALL_DEVICE ? 4 : 8,
    },
    explanationTitle: {
        fontSize: IS_SMALL_DEVICE ? 14 : 16,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: IS_SMALL_DEVICE ? 4 : 8,
    },
    explanationText: {
        fontSize: IS_SMALL_DEVICE ? 12 : 14,
        color: COLORS.textMuted,
        lineHeight: IS_SMALL_DEVICE ? 18 : 20,
    },
    bottomBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: IS_SMALL_DEVICE ? 8 : 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(148, 163, 184, 0.1)',
    },
    restartButton: {
        width: IS_SMALL_DEVICE ? 40 : 48,
        height: IS_SMALL_DEVICE ? 40 : 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    nextButton: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    nextButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: IS_SMALL_DEVICE ? 24 : 32,
        paddingVertical: IS_SMALL_DEVICE ? 10 : 14,
    },
    nextButtonText: {
        fontSize: IS_SMALL_DEVICE ? 14 : 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    loadingText: {
        fontSize: 16,
        color: COLORS.textMuted,
    },
});
