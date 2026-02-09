/**
 * 🎭 IdiomsScreen - Deyimler ve Kalıp İfadeler Ekranı
 * 
 * "break the ice", "a piece of cake" gibi İngilizce deyimleri öğren.
 * Her deyimin literal anlamı ve gerçek kullanımı gösterilir.
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
    Lightbulb,
    Info,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import { haptic, sound } from '../utils/sound';
import { useFarmStore } from '../store/farmStore';
import { updatePracticeScore } from '../utils/firebaseBattle';

// Veri kaynağı
import idiomsData from '../../assets/data/idioms.json';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_SMALL_DEVICE = SCREEN_HEIGHT < 700;
const IS_VERY_SMALL = SCREEN_HEIGHT < 620;
const IS_TABLET = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) >= 600;
const SESSION_SIZE = 5;

// 🎨 Renk paleti
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
};

interface IdiomQuestion {
    idiom: string;
    meaning: string;
    example: string;
    example_tr: string;
    literal: string;
    options: string[];
    correct: string;
    category: string;
}

// Yanlış anlamlar havuzu
const WRONG_MEANINGS = [
    "Çok yavaş hareket etmek",
    "Sessiz kalmak",
    "Hızlı koşmak",
    "Çok para harcamak",
    "Erken kalkmak",
    "Geç yatmak",
    "Kahvaltı yapmak",
    "Yüksek sesle konuşmak",
    "Düşük fiyata almak",
    "Uzun süre beklemek",
    "Çok fazla yemek",
    "Az uyumak",
    "Spor yapmak",
    "Kitap okumak",
    "Film izlemek",
    "Müzik dinlemek",
    "Yürüyüş yapmak",
    "Araba kullanmak",
    "Alışveriş yapmak",
    "Temizlik yapmak",
];

// Tüm soruları hazırla
function getAllQuestions(): IdiomQuestion[] {
    const questions: IdiomQuestion[] = [];
    
    idiomsData.idioms.forEach(idiom => {
        // Rastgele 3 yanlış anlam seç
        const shuffledWrong = [...WRONG_MEANINGS].sort(() => Math.random() - 0.5);
        const wrongOptions = shuffledWrong.slice(0, 3);
        
        // Doğru cevabı ve yanlışları karıştır
        const options = [idiom.meaning, ...wrongOptions].sort(() => Math.random() - 0.5);
        
        questions.push({
            idiom: idiom.idiom,
            meaning: idiom.meaning,
            example: idiom.example,
            example_tr: idiom.example_tr,
            literal: idiom.literal,
            options: options,
            correct: idiom.meaning,
            category: idiom.category,
        });
    });
    
    return questions.sort(() => Math.random() - 0.5);
}

// 🔘 Seçenek Butonu
interface OptionButtonProps {
    option: string;
    isSelected: boolean;
    isCorrect: boolean | null;
    onPress: () => void;
    disabled: boolean;
    index: number;
}

const OptionButton: React.FC<OptionButtonProps> = ({ 
    option, 
    isSelected, 
    isCorrect, 
    onPress, 
    disabled,
    index,
}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const labels = ['A', 'B', 'C', 'D'];

    useEffect(() => {
        if (isSelected && isCorrect !== null) {
            Animated.sequence([
                Animated.spring(scaleAnim, { toValue: 1.05, useNativeDriver: true, friction: 4 }),
                Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5 }),
            ]).start();
        }
    }, [isSelected, isCorrect]);

    const getButtonStyle = () => {
        if (isCorrect === true) {
            return { backgroundColor: 'rgba(34, 197, 94, 0.25)', borderColor: COLORS.success };
        }
        if (isCorrect === false && isSelected) {
            return { backgroundColor: 'rgba(239, 68, 68, 0.25)', borderColor: COLORS.error };
        }
        if (isSelected) {
            return { backgroundColor: 'rgba(139, 92, 246, 0.2)', borderColor: COLORS.accent };
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
                <View style={[
                    styles.optionLabel,
                    isCorrect === true && { backgroundColor: COLORS.success },
                    isCorrect === false && isSelected && { backgroundColor: COLORS.error },
                ]}>
                    <Text style={styles.optionLabelText}>{labels[index]}</Text>
                </View>
                <Text style={[
                    styles.optionText,
                    isCorrect === true && { color: COLORS.success },
                    isCorrect === false && isSelected && { color: COLORS.error },
                ]} numberOfLines={2}>
                    {option}
                </Text>
                {isCorrect === true && <Check size={20} color={COLORS.success} />}
                {isCorrect === false && isSelected && <X size={20} color={COLORS.error} />}
            </TouchableOpacity>
        </Animated.View>
    );
};

// 🎮 Ana Ekran
export default function IdiomsScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    
    // Store
    const addCoins = useFarmStore(state => state.addCoins);
    const updateQuestProgress = useFarmStore(state => state.updateQuestProgress);
    const user = useFarmStore(state => state.user);

    // State
    const [questions, setQuestions] = useState<IdiomQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [totalCorrect, setTotalCorrect] = useState(0);
    const [showLiteral, setShowLiteral] = useState(false);
    const allQuestionsRef = useRef<IdiomQuestion[]>([]);
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
            const basePoints = 5;
            const comboBonus = Math.floor(combo / 3);
            setScore(prev => prev + basePoints + comboBonus);
            
            // Ödül
            addCoins(2);
            updateQuestProgress('LEARN_IDIOMS', 1);
            
            // 📊 FIREBASE'E SKOR YAZ (Leaderboard için)
            if (user?.odId) {
                updatePracticeScore(user.odId, 'idioms', basePoints + comboBonus);
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
            setShowLiteral(false);
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
        setShowLiteral(false);
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
        setShowLiteral(false);
        animateIn();
    }, []);

    // Literal göster/gizle
    const toggleLiteral = useCallback(() => {
        haptic.light();
        setShowLiteral(prev => !prev);
    }, []);

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
                colors={['#0F172A', '#581C87', '#0F172A']}
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
                            <Text style={styles.headerTitle}>Deyimler</Text>
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
                            {/* Deyim Kartı */}
                            <View style={styles.idiomCard}>
                                <LinearGradient
                                    colors={['rgba(139, 92, 246, 0.2)', 'rgba(139, 92, 246, 0.05)']}
                                    style={styles.idiomGradient}
                                >
                                    <Text style={styles.idiomLabel}>🎭 Deyim:</Text>
                                    <Text style={styles.idiomText}>"{currentQuestion.idiom}"</Text>
                                    
                                    {/* Literal ipucu butonu */}
                                    <TouchableOpacity 
                                        style={styles.literalButton} 
                                        onPress={toggleLiteral}
                                        activeOpacity={0.7}
                                    >
                                        <Info size={16} color={COLORS.accent} />
                                        <Text style={styles.literalButtonText}>
                                            {showLiteral ? 'Gizle' : 'Kelime anlamı'}
                                        </Text>
                                    </TouchableOpacity>
                                    
                                    {showLiteral && (
                                        <View style={styles.literalBox}>
                                            <Text style={styles.literalLabel}>📖 Kelime anlamı:</Text>
                                            <Text style={styles.literalText}>"{currentQuestion.literal}"</Text>
                                        </View>
                                    )}
                                </LinearGradient>
                            </View>

                            {/* Soru */}
                            <View style={styles.questionCard}>
                                <Text style={styles.questionLabel}>❓ Bu deyimin anlamı nedir?</Text>
                            </View>

                            {/* Seçenekler */}
                            <View style={styles.optionsContainer}>
                                {currentQuestion.options.map((option, index) => (
                                    <OptionButton
                                        key={`${option}-${index}`}
                                        option={option}
                                        isSelected={selectedOption === option}
                                        isCorrect={selectedOption === option ? isCorrect : 
                                                  (selectedOption !== null && option === currentQuestion.correct ? true : null)}
                                        onPress={() => handleOptionPress(option)}
                                        disabled={selectedOption !== null}
                                        index={index}
                                    />
                                ))}
                            </View>

                            {/* Sonuç & Örnek */}
                            {selectedOption !== null && (
                                <View style={[
                                    styles.resultCard,
                                    { borderColor: isCorrect ? COLORS.success : COLORS.accent }
                                ]}>
                                    <View style={styles.resultHeader}>
                                        {isCorrect ? (
                                            <Check size={24} color={COLORS.success} />
                                        ) : (
                                            <Lightbulb size={24} color={COLORS.warning} />
                                        )}
                                        <Text style={[
                                            styles.resultTitle,
                                            { color: isCorrect ? COLORS.success : COLORS.warning }
                                        ]}>
                                            {isCorrect ? 'Harika!' : 'Doğru cevap:'}
                                        </Text>
                                    </View>
                                    
                                    {!isCorrect && (
                                        <Text style={styles.correctMeaning}>
                                            {currentQuestion.meaning}
                                        </Text>
                                    )}
                                    
                                    <View style={styles.exampleBox}>
                                        <Text style={styles.exampleLabel}>📝 Örnek Kullanım:</Text>
                                        <Text style={styles.exampleText}>"{currentQuestion.example}"</Text>
                                        <Text style={styles.exampleTr}>{currentQuestion.example_tr}</Text>
                                    </View>
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
                                    colors={['#8B5CF6', '#7C3AED']}
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
        height: 6,
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
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
    },
    statBadge: {
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.success,
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
    idiomCard: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.3)',
    },
    idiomGradient: {
        padding: 24,
        alignItems: 'center',
    },
    idiomLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginBottom: 8,
    },
    idiomText: {
        fontSize: IS_SMALL_DEVICE ? 22 : 26,
        fontWeight: '800',
        color: COLORS.accent,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    literalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 16,
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        borderRadius: 20,
    },
    literalButtonText: {
        fontSize: 13,
        color: COLORS.accent,
        fontWeight: '600',
    },
    literalBox: {
        marginTop: 16,
        padding: 12,
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        borderRadius: 12,
        width: '100%',
    },
    literalLabel: {
        fontSize: 11,
        color: COLORS.textMuted,
        marginBottom: 4,
    },
    literalText: {
        fontSize: 14,
        color: COLORS.text,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    questionCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    questionLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        textAlign: 'center',
    },
    optionsContainer: {
        gap: 10,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 14,
        borderWidth: 2,
    },
    optionLabel: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(139, 92, 246, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionLabelText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
    },
    optionText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
    },
    resultCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        borderRadius: 16,
        padding: 20,
        borderWidth: 2,
        marginTop: 8,
    },
    resultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    resultTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    correctMeaning: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.accent,
        marginBottom: 16,
        textAlign: 'center',
    },
    exampleBox: {
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        borderRadius: 12,
        padding: 16,
    },
    exampleLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginBottom: 8,
    },
    exampleText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
        fontStyle: 'italic',
        marginBottom: 8,
    },
    exampleTr: {
        fontSize: 13,
        color: COLORS.textMuted,
    },
    bottomBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
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
        borderRadius: 16,
        overflow: 'hidden',
    },
    nextButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 32,
        paddingVertical: 14,
    },
    nextButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    loadingText: {
        fontSize: 16,
        color: COLORS.textMuted,
    },
});
