/**
 * 🔗 WordMatchScreen - Duolingo Tarzı Kelime Eşleştirme
 * 
 * Sol sütunda İngilizce, sağ sütunda Türkçe kutucuklar.
 * Kullanıcı önce bir kutucuğa, sonra eşine dokunur.
 * 
 * ✨ v2.0 - Heyecan & Animasyon Güncellemesi:
 * - Timer ve speed bonus sistemi
 * - Glow efekti seçimde
 * - Shake animasyonu yanlışlarda
 * - Combo animasyonları (🔥 efekti)
 * - Friction/Tension physics (Quiz tarzı)
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    Platform,
    ScrollView,
    Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
    ChevronLeft,
    RotateCcw,
    Star,
    Sparkles,
    Link,
    Check,
    Clock,
    Zap,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import { haptic, sound } from '../utils/sound';
import { useFarmStore } from '../store/farmStore';
import { updatePracticeScore } from '../utils/firebaseBattle';

// Veri kaynağı
import ensaglamData from '../../assets/data/ensaglamdata_with_example_tr.json';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_SMALL_DEVICE = SCREEN_HEIGHT < 700;
const IS_VERY_SMALL = SCREEN_HEIGHT < 620;
const IS_TABLET = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) >= 600;
const BOTTOM_NAV_SAFE_GAP = Platform.OS === 'ios' ? (IS_SMALL_DEVICE ? 72 : 84) : 64;

// ⏱️ SPEED BONUS SİSTEMİ
const SPEED_BONUS = {
    FAST: { threshold: 3, bonus: 3, label: '⚡ HIZLI!', color: '#22C55E' },
    NORMAL: { threshold: 6, bonus: 2, label: '👍 İYİ', color: '#3B82F6' },
    SLOW: { threshold: 10, bonus: 1, label: '🐢 Yavaş', color: '#F59E0B' },
};

// 🎨 Renk paleti
const COLORS = {
    background: '#0F172A',
    surface: 'rgba(30, 41, 59, 0.95)',
    accent: '#3B82F6',
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F59E0B',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    border: 'rgba(148, 163, 184, 0.3)',
    selected: '#8B5CF6',
    glow: 'rgba(139, 92, 246, 0.5)',
    comboFire: '#F97316',
};

// Zorluk seviyeleri
const DIFFICULTY_LEVELS = {
    easy: 4,
    medium: 6,
    hard: 8,
};

// ⏱️ Tur başına süre (saniye)
const ROUND_TIME = {
    easy: 35,
    medium: 50,
    hard: 65,
};

interface WordItem {
    word: string;
    tr: string;
}

interface MatchCard {
    id: string;
    text: string;
    type: 'en' | 'tr';
    pairId: string;
    status: 'idle' | 'selected' | 'matched' | 'wrong';
}

// 🎴 Tek Kart Komponenti - Quiz tarzı animasyonlarla
interface CardProps {
    card: MatchCard;
    onPress: (card: MatchCard) => void;
    disabled: boolean;
    comboCount: number;
}

const Card = memo<CardProps>(({ card, onPress, disabled, comboCount }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (card.status === 'selected') {
            // Quiz tarzı: Friction 4, Tension 350 - Daha canlı
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1.08,
                    useNativeDriver: true,
                    friction: 4,
                    tension: 350,
                }),
                // Glow efekti
                Animated.timing(glowAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: false,
                }),
                // Pulse animasyonu
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(pulseAnim, { toValue: 1.02, duration: 400, useNativeDriver: true }),
                        Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
                    ])
                ),
            ]).start();
        } else if (card.status === 'matched') {
            // Başarı animasyonu - Daha dramatik
            pulseAnim.stopAnimation();
            Animated.sequence([
                Animated.spring(scaleAnim, { 
                    toValue: 1.15, 
                    useNativeDriver: true, 
                    friction: 3,
                    tension: 400,
                }),
                Animated.spring(scaleAnim, { 
                    toValue: 1, 
                    useNativeDriver: true, 
                    friction: 5,
                    tension: 200,
                }),
            ]).start();
            glowAnim.setValue(0);
        } else if (card.status === 'wrong') {
            // Shake animasyonu - Daha güçlü
            pulseAnim.stopAnimation();
            Animated.sequence([
                Animated.timing(shakeAnim, { toValue: 15, duration: 40, useNativeDriver: true, easing: Easing.linear }),
                Animated.timing(shakeAnim, { toValue: -15, duration: 40, useNativeDriver: true, easing: Easing.linear }),
                Animated.timing(shakeAnim, { toValue: 12, duration: 40, useNativeDriver: true, easing: Easing.linear }),
                Animated.timing(shakeAnim, { toValue: -12, duration: 40, useNativeDriver: true, easing: Easing.linear }),
                Animated.timing(shakeAnim, { toValue: 8, duration: 40, useNativeDriver: true, easing: Easing.linear }),
                Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true, easing: Easing.linear }),
            ]).start();
            glowAnim.setValue(0);
        } else {
            pulseAnim.stopAnimation();
            scaleAnim.setValue(1);
            glowAnim.setValue(0);
        }
    }, [card.status]);

    const getCardStyle = () => {
        switch (card.status) {
            case 'selected':
                return { borderColor: COLORS.selected, backgroundColor: 'rgba(139, 92, 246, 0.25)' };
            case 'matched':
                return { borderColor: COLORS.success, backgroundColor: 'rgba(34, 197, 94, 0.25)', opacity: 0.7 };
            case 'wrong':
                return { borderColor: COLORS.error, backgroundColor: 'rgba(239, 68, 68, 0.25)' };
            default:
                return { borderColor: COLORS.border, backgroundColor: 'rgba(30, 41, 59, 0.8)' };
        }
    };

    const shadowColor = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['transparent', COLORS.glow],
    });

    return (
        <Animated.View
            style={[
                { 
                    transform: [
                        { scale: Animated.multiply(scaleAnim, pulseAnim) }, 
                        { translateX: shakeAnim }
                    ],
                },
                card.status === 'selected' && {
                    shadowColor: COLORS.selected,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.6,
                    shadowRadius: 12,
                    elevation: 8,
                },
            ]}
        >
            <TouchableOpacity
                style={[styles.card, getCardStyle()]}
                onPress={() => onPress(card)}
                disabled={disabled || card.status === 'matched'}
                activeOpacity={0.7}
            >
                <Text style={[
                    styles.cardText,
                    card.status === 'matched' && { color: COLORS.success },
                    card.status === 'selected' && { color: COLORS.selected, fontWeight: '800' },
                ]} numberOfLines={2}>
                    {card.text}
                </Text>
                {card.status === 'matched' && (
                    <View style={styles.checkIconContainer}>
                        <Check size={14} color="#fff" />
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
});
Card.displayName = 'Card';

// 🔥 Combo Display Komponenti
const ComboDisplay = memo<{ combo: number; visible: boolean }>(({ combo, visible }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible && combo > 0) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 4,
                    tension: 300,
                    useNativeDriver: true,
                }),
                Animated.sequence([
                    Animated.timing(rotateAnim, { toValue: -0.05, duration: 100, useNativeDriver: true }),
                    Animated.timing(rotateAnim, { toValue: 0.05, duration: 100, useNativeDriver: true }),
                    Animated.timing(rotateAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
                ]),
            ]).start();
        } else {
            scaleAnim.setValue(0);
        }
    }, [combo, visible]);

    if (!visible || combo < 2) return null;

    const fireEmojis = combo >= 5 ? '🔥🔥🔥' : combo >= 3 ? '🔥🔥' : '🔥';

    return (
        <Animated.View style={[
            styles.comboDisplayContainer,
            {
                transform: [
                    { scale: scaleAnim },
                    { rotate: rotateAnim.interpolate({
                        inputRange: [-0.05, 0, 0.05],
                        outputRange: ['-3deg', '0deg', '3deg'],
                    })},
                ],
            },
        ]}>
            <LinearGradient
                colors={['rgba(249, 115, 22, 0.95)', 'rgba(234, 88, 12, 0.95)']}
                style={styles.comboGradient}
            >
                <Text style={styles.comboFireEmoji}>{fireEmojis}</Text>
                <Text style={styles.comboNumber}>{combo}x</Text>
                <Text style={styles.comboLabel}>COMBO!</Text>
            </LinearGradient>
        </Animated.View>
    );
});

// ⏱️ Timer Display
const TimerDisplay = memo<{ timeLeft: number; totalTime: number }>(({ timeLeft, totalTime }) => {
    const progressAnim = useRef(new Animated.Value(1)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        progressAnim.setValue(timeLeft / totalTime);
    }, [timeLeft, totalTime]);

    useEffect(() => {
        if (timeLeft <= 10 && timeLeft > 0) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.1, duration: 300, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [timeLeft <= 10]);

    const timerColor = timeLeft <= 10 ? COLORS.error : timeLeft <= 20 ? COLORS.warning : COLORS.accent;
    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <Animated.View style={[styles.timerContainer, { transform: [{ scale: pulseAnim }] }]}>
            <Clock size={16} color={timerColor} />
            <Text style={[styles.timerText, { color: timerColor }]}>{timeLeft}s</Text>
            <View style={styles.timerBarContainer}>
                <Animated.View 
                    style={[
                        styles.timerBar, 
                        { width: progressWidth, backgroundColor: timerColor }
                    ]} 
                />
            </View>
        </Animated.View>
    );
});

// 🎮 Ana Ekran
export default function WordMatchScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    
    // Store
    const addCoins = useFarmStore(state => state.addCoins);
    const updateQuestProgress = useFarmStore(state => state.updateQuestProgress);
    const user = useFarmStore(state => state.user);

    // State
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
    const [round, setRound] = useState(1);
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [cards, setCards] = useState<MatchCard[]>([]);
    const [selectedCard, setSelectedCard] = useState<MatchCard | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [matchedPairs, setMatchedPairs] = useState(0);
    const [wrongAttempts, setWrongAttempts] = useState(0);
    const [showResult, setShowResult] = useState(false);
    
    // ⏱️ Timer state
    const [timeLeft, setTimeLeft] = useState(ROUND_TIME.easy);
    const [matchTimes, setMatchTimes] = useState<number[]>([]);
    const [lastMatchTime, setLastMatchTime] = useState<number>(Date.now());
    const [speedBonusTotal, setSpeedBonusTotal] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Animasyonlar
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const speedBonusAnim = useRef(new Animated.Value(0)).current;
    const [showSpeedBonus, setShowSpeedBonus] = useState<typeof SPEED_BONUS.FAST | null>(null);

    // Kelime havuzundan rastgele seç
    const getRandomWords = useCallback((count: number): WordItem[] => {
        const data = ensaglamData as { items: any[] };
        const validItems = data.items.filter(item => 
            item.word && item.tr && 
            item.word.length <= 15 && 
            item.tr.length <= 25
        );
        
        const shuffled = [...validItems].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count).map(item => ({
            word: item.word,
            tr: item.tr.split(';')[0].split(',')[0].trim(), // İlk anlamı al
        }));
    }, []);

    // Kartları oluştur
    const initializeRound = useCallback(() => {
        // Timer'ı temizle
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        
        const wordCount = DIFFICULTY_LEVELS[difficulty];
        const words = getRandomWords(wordCount);
        
        const enCards: MatchCard[] = words.map((w, i) => ({
            id: `en-${i}`,
            text: w.word,
            type: 'en',
            pairId: `pair-${i}`,
            status: 'idle',
        }));
        
        const trCards: MatchCard[] = words.map((w, i) => ({
            id: `tr-${i}`,
            text: w.tr,
            type: 'tr',
            pairId: `pair-${i}`,
            status: 'idle',
        }));

        // Türkçe kartları karıştır
        const shuffledTrCards = [...trCards].sort(() => Math.random() - 0.5);
        
        setCards([...enCards, ...shuffledTrCards]);
        setSelectedCard(null);
        setMatchedPairs(0);
        setWrongAttempts(0);
        setShowResult(false);
        setIsProcessing(false);
        setMatchTimes([]);
        setLastMatchTime(Date.now());
        setSpeedBonusTotal(0);
        
        // ⏱️ Timer'ı başlat
        const roundTime = ROUND_TIME[difficulty];
        setTimeLeft(roundTime);
        
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    // Süre bitti - sonuç ekranını göster
                    setTimeout(() => handleTimeUp(), 100);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [difficulty, getRandomWords, fadeAnim]);

    // Süre bittiğinde
    const handleTimeUp = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        setShowResult(true);
        haptic.warning();
    }, []);

    // Cleanup
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    useEffect(() => {
        initializeRound();
    }, [round, difficulty]);

    // Kart seçimi
    const handleCardPress = useCallback((card: MatchCard) => {
        if (isProcessing || card.status === 'matched') return;

        // 📳 COMBO'YA GÖRE ÇOK AGRESİF HAPTİC FEEDBACK (Arcade Modu)
        if (combo >= 7) {
            haptic.rigid(); // ÇOK GÜÇLÜ!
            haptic.heavy();
        } else if (combo >= 5) {
            haptic.heavy(); // GÜÇLÜ
            haptic.medium();
        } else if (combo >= 3) {
            haptic.medium(); // ORTA
            haptic.light();
        } else {
            haptic.light(); // HAFİF
        }

        if (!selectedCard) {
            // İlk kart seçimi
            setCards(prev => prev.map(c => 
                c.id === card.id ? { ...c, status: 'selected' } : c
            ));
            setSelectedCard(card);
        } else if (selectedCard.id === card.id) {
            // Aynı karta tıklama - seçimi kaldır
            setCards(prev => prev.map(c => 
                c.id === card.id ? { ...c, status: 'idle' } : c
            ));
            setSelectedCard(null);
        } else if (selectedCard.type === card.type) {
            // Aynı tipte karta tıklama - seçimi değiştir
            setCards(prev => prev.map(c => {
                if (c.id === card.id) return { ...c, status: 'selected' };
                if (c.id === selectedCard.id) return { ...c, status: 'idle' };
                return c;
            }));
            setSelectedCard(card);
        } else {
            // Farklı tipte kart - eşleşme kontrolü
            setIsProcessing(true);
            
            if (selectedCard.pairId === card.pairId) {
                // Doğru eşleşme!
                const newCombo = combo + 1;
                
                // 📳 HER DOĞRU EŞLEŞMEDE GÜÇLÜ HAPTiC - hasat gibi!
                haptic.harvestCelebration();
                
                sound.playCorrect();
                
                // ⏱️ Speed bonus hesapla
                const now = Date.now();
                const matchDuration = (now - lastMatchTime) / 1000;
                setLastMatchTime(now);
                setMatchTimes(prev => [...prev, matchDuration]);
                
                let speedBonus = 0;
                if (matchDuration <= SPEED_BONUS.FAST.threshold) {
                    speedBonus = SPEED_BONUS.FAST.bonus;
                    setShowSpeedBonus(SPEED_BONUS.FAST);
                } else if (matchDuration <= SPEED_BONUS.NORMAL.threshold) {
                    speedBonus = SPEED_BONUS.NORMAL.bonus;
                    setShowSpeedBonus(SPEED_BONUS.NORMAL);
                } else if (matchDuration <= SPEED_BONUS.SLOW.threshold) {
                    speedBonus = SPEED_BONUS.SLOW.bonus;
                    setShowSpeedBonus(SPEED_BONUS.SLOW);
                }
                
                if (speedBonus > 0) {
                    setSpeedBonusTotal(prev => prev + speedBonus);
                    // Speed bonus animasyonu
                    Animated.sequence([
                        Animated.timing(speedBonusAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
                        Animated.delay(800),
                        Animated.timing(speedBonusAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
                    ]).start(() => setShowSpeedBonus(null));
                }
                
                setCards(prev => prev.map(c => {
                    if (c.id === card.id || c.id === selectedCard.id) {
                        return { ...c, status: 'matched' };
                    }
                    return c;
                }));
                
                const newMatchedPairs = matchedPairs + 1;
                setMatchedPairs(newMatchedPairs);
                const updatedCombo = combo + 1;
                setCombo(updatedCombo);
                if (updatedCombo > maxCombo) setMaxCombo(updatedCombo);
                
                // Puan hesapla - speed bonus dahil
                const basePoints = 5;
                const comboBonus = Math.floor(updatedCombo / 2);
                const points = basePoints + comboBonus + speedBonus;
                setScore(prev => prev + points);
                
                // Tüm eşleşmeler tamamlandı mı?
                const totalPairs = DIFFICULTY_LEVELS[difficulty];
                if (newMatchedPairs >= totalPairs) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    // 🚀 ANINDA SONUÇ EKRANI - ŞAK diye gelsin!
                    setTimeout(() => {
                        handleRoundComplete();
                    }, 150); // HIZLI: 150ms (eskiden 500ms)
                }
            } else {
                // Yanlış eşleşme
                haptic.error();
                sound.playWrong();
                
                setCards(prev => prev.map(c => {
                    if (c.id === card.id || c.id === selectedCard.id) {
                        return { ...c, status: 'wrong' };
                    }
                    return c;
                }));
                
                setWrongAttempts(prev => prev + 1);
                setCombo(0);
                
                // Yanlış kartları sıfırla - ARCADE: 200ms (eskiden 500ms)
                setTimeout(() => {
                    setCards(prev => prev.map(c => {
                        if (c.status === 'wrong') {
                            return { ...c, status: 'idle' };
                        }
                        return c;
                    }));
                }, 200);
            }
            
            setSelectedCard(null);
            setTimeout(() => setIsProcessing(false), 80); // ARCADE: 80ms (eskiden 300ms)
        }
    }, [selectedCard, isProcessing, matchedPairs, combo, difficulty]);

    // Tur tamamlandı
    const handleRoundComplete = useCallback(async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setShowResult(true);
        
        // Ödül hesapla - Speed bonus ve time bonus dahil
        const baseCoins = 8;
        const roundBonus = round * 3;
        const difficultyBonus = difficulty === 'hard' ? 8 : difficulty === 'medium' ? 5 : 0;
        const timeBonus = Math.floor(timeLeft / 5); // Her 5 saniye için 1 coin
        const comboBonus = maxCombo * 2;
        const totalCoins = baseCoins + roundBonus + difficultyBonus + timeBonus + comboBonus + speedBonusTotal;
        
        addCoins(totalCoins);
        try {
            updateQuestProgress('MATCH_WORDS', 1);
        } catch (error) {
            console.error('[WordMatch] quest progress update failed:', error);
        }
        
        // 🎉💥 MEGA KUTLAMA - TELEFONU KUDURT!
        if (user?.odId) {
            const scoreToAdd = totalCoins + (maxCombo * 5); // Coin + combo bonus
            try {
                updatePracticeScore(user.odId, 'wordmatch', scoreToAdd);
            } catch (error) {
                console.error('[WordMatch] practice score sync failed:', error);
            }
        }
        
        // 📳🔥 ÇOK GÜÇLÜ CELEBRATION HAPTIC + HASAT SESİ!
        haptic.masterCelebration(); // 5x heavy + success
        setTimeout(() => haptic.celebration(), 300); // Dalga dalga kutlama
        setTimeout(() => haptic.heavy(), 600);
        setTimeout(() => haptic.rigid(), 650);
        setTimeout(() => haptic.heavy(), 700);
        
        sound.playHarvest(); // HASAT SESİ - ÇOK ÖNEMLİ!
        setTimeout(() => sound.playSuccess(), 400);
    }, [round, difficulty, timeLeft, maxCombo, speedBonusTotal, addCoins, updateQuestProgress, user]);

    // Sonraki tur
    const handleNextRound = useCallback(() => {
        setRound(prev => prev + 1);
        
        // Zorluk artır
        if (round >= 3 && difficulty === 'easy') {
            setDifficulty('medium');
        } else if (round >= 6 && difficulty === 'medium') {
            setDifficulty('hard');
        }
    }, [round, difficulty]);

    // Geri
    const handleBack = useCallback(() => {
        haptic.light();
        navigation.goBack();
    }, [navigation]);

    // Kartları ayır
    const enCards = useMemo(() => cards.filter(c => c.type === 'en'), [cards]);
    const trCards = useMemo(() => cards.filter(c => c.type === 'tr'), [cards]);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0F172A', '#1E3A5F', '#0F172A']}
                style={styles.gradient}
            >
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    {/* Header */}
                    <View style={[styles.header, IS_VERY_SMALL && { paddingVertical: 8 }]}>
                        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                            <ChevronLeft size={IS_SMALL_DEVICE ? 24 : 28} color={COLORS.text} />
                        </TouchableOpacity>

                        <View style={styles.headerCenter}>
                            <Link size={IS_SMALL_DEVICE ? 16 : 18} color={COLORS.accent} />
                            <Text style={[styles.headerTitle, IS_SMALL_DEVICE && { fontSize: 16 }]}>Kelime Eşleştir</Text>
                        </View>

                        <View style={styles.scoreContainer}>
                            <Star size={14} color="#FBBF24" fill="#FBBF24" />
                            <Text style={styles.scoreText}>{score}</Text>
                        </View>
                    </View>

                    {/* Progress + Timer Row */}
                    <View style={[styles.progressRow, IS_VERY_SMALL && { paddingVertical: 4 }]}>
                        <View style={styles.progressLeft}>
                            <Text style={[styles.progressText, IS_SMALL_DEVICE && { fontSize: 12 }]}>
                                Tur {round} • {difficulty === 'easy' ? 'Kolay' : difficulty === 'medium' ? 'Orta' : 'Zor'}
                            </Text>
                        </View>
                        
                        {!showResult && (
                            <TimerDisplay timeLeft={timeLeft} totalTime={ROUND_TIME[difficulty]} />
                        )}
                        
                        {combo >= 2 && (
                            <View style={styles.comboBadge}>
                                <Text style={styles.comboText}>🔥 {combo}x</Text>
                            </View>
                        )}
                    </View>

                    {/* Speed Bonus Toast */}
                    {showSpeedBonus && (
                        <Animated.View style={[
                            styles.speedBonusToast,
                            {
                                opacity: speedBonusAnim,
                                transform: [{ 
                                    translateY: speedBonusAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [-20, 0],
                                    })
                                }],
                            }
                        ]}>
                            <Zap size={16} color={showSpeedBonus.color} />
                            <Text style={[styles.speedBonusText, { color: showSpeedBonus.color }]}>
                                {showSpeedBonus.label} +{showSpeedBonus.bonus}
                            </Text>
                        </Animated.View>
                    )}

                    {/* Combo Display Overlay */}
                    <ComboDisplay combo={combo} visible={combo >= 2} />

                    {/* Oyun Alanı */}
                    <ScrollView 
                        style={styles.gameScrollView}
                        contentContainerStyle={styles.gameScrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <Animated.View style={[styles.gameArea, { opacity: fadeAnim }]}>
                            {!showResult ? (
                                <View style={styles.columnsContainer}>
                                    {/* İngilizce Sütunu */}
                                    <View style={styles.column}>
                                        <Text style={[styles.columnTitle, IS_SMALL_DEVICE && { fontSize: 12 }]}>🇬🇧 English</Text>
                                        {enCards.map(card => (
                                            <Card
                                                key={card.id}
                                                card={card}
                                                onPress={handleCardPress}
                                                disabled={isProcessing}
                                                comboCount={combo}
                                            />
                                        ))}
                                    </View>

                                    {/* Türkçe Sütunu */}
                                    <View style={styles.column}>
                                        <Text style={[styles.columnTitle, IS_SMALL_DEVICE && { fontSize: 12 }]}>🇹🇷 Türkçe</Text>
                                        {trCards.map(card => (
                                            <Card
                                                key={card.id}
                                                card={card}
                                                onPress={handleCardPress}
                                                disabled={isProcessing}
                                                comboCount={combo}
                                            />
                                        ))}
                                    </View>
                                </View>
                            ) : (
                                /* Sonuç Ekranı */
                                <View style={styles.resultContainer}>
                                    <Sparkles size={IS_SMALL_DEVICE ? 40 : 48} color="#FBBF24" />
                                    <Text style={[styles.resultTitle, IS_SMALL_DEVICE && { fontSize: 24 }]}>
                                        {timeLeft > 0 ? 'Harika! \u{1F389}' : 'Sure Bitti! \u{23F0}'}
                                    </Text>
                                    <Text style={styles.resultSubtitle}>
                                        Tur {round} {timeLeft > 0 ? 'tamamlandi!' : ''}
                                    </Text>
                                
                                <View style={[styles.resultStats, IS_SMALL_DEVICE && { gap: 20 }]}>
                                    <View style={styles.statItem}>
                                        <Text style={[styles.statValue, IS_SMALL_DEVICE && { fontSize: 20 }]}>{matchedPairs}</Text>
                                        <Text style={styles.statLabel}>Eslesme</Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <Text style={[styles.statValue, IS_SMALL_DEVICE && { fontSize: 20 }]}>{wrongAttempts}</Text>
                                        <Text style={styles.statLabel}>Hata</Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <Text style={[styles.statValue, IS_SMALL_DEVICE && { fontSize: 20 }]}>{score}</Text>
                                        <Text style={styles.statLabel}>Puan</Text>
                                    </View>
                                    {maxCombo >= 2 && (
                                        <View style={styles.statItem}>
                                            <Text style={[styles.statValue, { color: COLORS.comboFire }, IS_SMALL_DEVICE && { fontSize: 20 }]}>Combo {maxCombo}x</Text>
                                            <Text style={styles.statLabel}>Max Combo</Text>
                                        </View>
                                    )}
                                </View>

                                {speedBonusTotal > 0 && (
                                    <View style={styles.speedBonusSummary}>
                                        <Zap size={16} color={COLORS.success} />
                                        <Text style={styles.speedBonusSummaryText}>
                                            H\u0131z Bonusu: +{speedBonusTotal}
                                        </Text>
                                    </View>
                                )}

                                <TouchableOpacity style={styles.nextButton} onPress={handleNextRound}>
                                    <LinearGradient
                                        colors={['#22C55E', '#16A34A']}
                                        style={styles.nextButtonGradient}
                                    >
                                        <Text style={styles.nextButtonText}>Sonraki Tur</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        )}
                        </Animated.View>
                    </ScrollView>

                    {/* Alt Butonlar - Responsive */}
                    {!showResult && (
                        <View style={[
                            styles.bottomBar,
                            {
                                paddingBottom: Math.max(insets.bottom, IS_SMALL_DEVICE ? 5 : 8),
                                marginBottom: BOTTOM_NAV_SAFE_GAP,
                            }
                        ]}>
                            <TouchableOpacity 
                                style={styles.resetButton}
                                onPress={initializeRound}
                            >
                                <RotateCcw size={IS_SMALL_DEVICE ? 18 : 20} color={COLORS.textMuted} />
                                <Text style={[styles.resetButtonText, IS_SMALL_DEVICE && { fontSize: 12 }]}>Kartları Karıştır</Text>
                            </TouchableOpacity>

                            <Text style={[styles.hintText, IS_SMALL_DEVICE && { fontSize: 10 }]}>
                                Bir kelimeye dokun, sonra e\u015Fini bul
                            </Text>
                        </View>
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
    progressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: IS_SMALL_DEVICE ? 6 : 8,
        flexWrap: 'wrap',
        gap: 8,
    },
    progressLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    progressText: {
        fontSize: IS_SMALL_DEVICE ? 12 : 14,
        color: COLORS.textMuted,
    },
    comboBadge: {
        backgroundColor: 'rgba(249, 115, 22, 0.25)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(249, 115, 22, 0.5)',
    },
    comboText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#F97316',
    },
    // Timer
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    timerText: {
        fontSize: 14,
        fontWeight: '700',
    },
    timerBarContainer: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    timerBar: {
        height: '100%',
        borderRadius: 2,
    },
    // Speed Bonus Toast
    speedBonusToast: {
        position: 'absolute',
        top: 120,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        zIndex: 100,
    },
    speedBonusText: {
        fontSize: 14,
        fontWeight: '700',
    },
    // Combo Display
    comboDisplayContainer: {
        position: 'absolute',
        top: IS_SMALL_DEVICE ? 100 : 130,
        right: 16,
        zIndex: 50,
    },
    comboGradient: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        alignItems: 'center',
    },
    comboFireEmoji: {
        fontSize: 16,
    },
    comboNumber: {
        fontSize: 20,
        fontWeight: '900',
        color: '#fff',
    },
    comboLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.8)',
    },
    // Game Area
    gameScrollView: {
        flex: 1,
    },
    gameScrollContent: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    gameArea: {
        flex: 1,
        paddingHorizontal: IS_TABLET ? 24 : 12,
    },
    columnsContainer: {
        flex: 1,
        flexDirection: 'row',
        gap: IS_SMALL_DEVICE ? 8 : 12,
        paddingTop: IS_SMALL_DEVICE ? 8 : 16,
    },
    column: {
        flex: 1,
        gap: IS_SMALL_DEVICE ? 6 : 8,
    },
    columnTitle: {
        fontSize: IS_SMALL_DEVICE ? 12 : 14,
        fontWeight: '600',
        color: COLORS.textMuted,
        textAlign: 'center',
        marginBottom: IS_SMALL_DEVICE ? 4 : 8,
    },
    card: {
        borderRadius: 12,
        borderWidth: 2,
        padding: IS_SMALL_DEVICE ? 10 : 12,
        minHeight: IS_SMALL_DEVICE ? 44 : 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardText: {
        fontSize: IS_VERY_SMALL ? 12 : IS_SMALL_DEVICE ? 13 : 15,
        fontWeight: '600',
        color: COLORS.text,
        textAlign: 'center',
    },
    checkIconContainer: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: COLORS.success,
        justifyContent: 'center',
        alignItems: 'center',
    },
    resultContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: IS_SMALL_DEVICE ? 12 : 16,
        paddingHorizontal: 20,
    },
    resultTitle: {
        fontSize: IS_SMALL_DEVICE ? 24 : 28,
        fontWeight: '800',
        color: COLORS.text,
    },
    resultSubtitle: {
        fontSize: IS_SMALL_DEVICE ? 14 : 16,
        color: COLORS.textMuted,
    },
    resultStats: {
        flexDirection: 'row',
        gap: IS_SMALL_DEVICE ? 20 : 32,
        marginTop: IS_SMALL_DEVICE ? 16 : 24,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: IS_SMALL_DEVICE ? 20 : 24,
        fontWeight: '700',
        color: COLORS.text,
    },
    statLabel: {
        fontSize: IS_SMALL_DEVICE ? 10 : 12,
        color: COLORS.textMuted,
    },
    speedBonusSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginTop: 8,
    },
    speedBonusSummaryText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.success,
    },
    nextButton: {
        marginTop: IS_SMALL_DEVICE ? 20 : 32,
        borderRadius: 16,
        overflow: 'hidden',
    },
    nextButtonGradient: {
        paddingHorizontal: IS_SMALL_DEVICE ? 36 : 48,
        paddingVertical: IS_SMALL_DEVICE ? 12 : 16,
    },
    nextButtonText: {
        fontSize: IS_SMALL_DEVICE ? 16 : 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    bottomBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingTop: IS_SMALL_DEVICE ? 2 : 4,
        paddingBottom: 4,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(148, 163, 184, 0.1)',
    },
    resetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: IS_SMALL_DEVICE ? 5 : 6,
        paddingHorizontal: IS_SMALL_DEVICE ? 8 : 10,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
    },
    resetButtonText: {
        fontSize: IS_SMALL_DEVICE ? 12 : 14,
        color: COLORS.textMuted,
    },
    hintText: {
        fontSize: IS_SMALL_DEVICE ? 10 : 12,
        color: COLORS.textMuted,
        fontStyle: 'italic',
        lineHeight: IS_SMALL_DEVICE ? 13 : 15,
        flex: 1,
        textAlign: 'right',
    },
});
