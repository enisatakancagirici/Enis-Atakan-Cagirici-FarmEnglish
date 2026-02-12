
import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Star, Zap, Clock, Coins, Hash, RefreshCw, Home, XCircle, CheckCircle2, Sprout, BookOpen, ChevronDown, ChevronUp } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { useFarmStore } from '../store/farmStore';
import { haptic, sound } from '../utils/sound';

// Responsive Helpers
const { width, height } = Dimensions.get('window');
const scale = Math.min(width / 375, height / 812);
const normalize = (size: number) => Math.round(size * scale);

// Battle Question & Answer Types
interface BattleQuestion {
    wordId: string;
    wordText: string;
    correctAnswer: string;
    options: string[];
}

interface BattleAnswer {
    questionIndex: number;
    selectedOption: string;
    isCorrect: boolean;
    timeMs: number;
}

interface WrongWord {
    wordId: string;
    wordText: string;
    correctAnswer: string; // Türkçe anlam
    userAnswer: string;
    addedToFarm: boolean;
}

interface BattleResultProps {
    result: 'win' | 'loss' | 'draw';
    myScore: number;
    opponentScore: number;
    myInfo: any;
    opponentInfo: any;
    rewards: { xp: number; coin: number };
    stats: { accuracy: number; speed: number; streak: number };
    questions?: BattleQuestion[];
    myAnswers?: BattleAnswer[];
    onPlayAgain: () => void;
    onHome: () => void;
}

export const BattleResultScreen: React.FC<BattleResultProps> = ({
    result,
    myScore,
    opponentScore,
    myInfo,
    opponentInfo,
    rewards,
    stats,
    questions,
    myAnswers,
    onPlayAgain,
    onHome
}) => {
    const insets = useSafeAreaInsets();
    const updateQuestProgress = useFarmStore(state => state.updateQuestProgress);
    const farm = useFarmStore(state => state.farm);
    const inventory = useFarmStore(state => state.inventory);
    const pool = useFarmStore(state => state.pool);
    
    // UI state
    const [showWrongWords, setShowWrongWords] = useState(true);
    const [seedsAdded, setSeedsAdded] = useState(false);
    const [addedCount, setAddedCount] = useState(0);

    const normalizeWordText = useCallback((text?: string) => (text || '').trim().toLowerCase(), []);

    const isWordInCollection = useCallback(
        (collection: any[], wordId?: string, wordText?: string) => {
            if (!collection || collection.length === 0) return false;

            const normalizedQuestionText = normalizeWordText(wordText);
            return collection.some(item => {
                if (wordId && item?.id === wordId) return true;
                const itemText = normalizeWordText(item?.text || item?.verb || item?.word);
                return itemText && normalizedQuestionText && itemText === normalizedQuestionText;
            });
        },
        [normalizeWordText]
    );

    // 🎯 YANLIŞ KELİMELERİ TESPİT ET
    const wrongWords = useMemo<WrongWord[]>(() => {
        if (!questions || !myAnswers || questions.length === 0) return [];
        
        return myAnswers
            .filter(answer => !answer.isCorrect)
            .map(answer => {
                const question = questions[answer.questionIndex];
                if (!question) return null;
                
                // Kelime zaten farm veya envanterde mi?
                const isInFarm = isWordInCollection(farm, question.wordId, question.wordText);
                const isInInventory = isWordInCollection(inventory, question.wordId, question.wordText);
                
                return {
                    wordId: question.wordId,
                    wordText: question.wordText,
                    correctAnswer: question.correctAnswer,
                    userAnswer: answer.selectedOption,
                    addedToFarm: isInFarm || isInInventory
                };
            })
            .filter((w): w is WrongWord => w !== null);
    }, [questions, myAnswers, farm, inventory, isWordInCollection]);

    const safeAccuracy = Number.isFinite(stats?.accuracy) ? Math.max(0, Math.min(100, Math.round(stats.accuracy))) : 0;
    const safeSpeed = Number.isFinite(stats?.speed) ? Math.max(0, Math.min(100, Math.round(stats.speed))) : 0;
    const safeStreak = Number.isFinite(stats?.streak) ? Math.max(0, Math.round(stats.streak)) : 0;

    // 🌱 YANLIŞ KELİMELERİ OTOMATIK TOHUM OLARAK EKLE
    useEffect(() => {
        if (seedsAdded || wrongWords.length === 0) return;
        
        const newSeedsCount = useFarmStore.getState().addBattleSeeds(wrongWords);
        
        if (newSeedsCount > 0) {
            haptic.success();
        }
        
        setAddedCount(newSeedsCount);
        setSeedsAdded(true);
    }, [wrongWords, seedsAdded]);

    // 🎯 GÜNLÜK GÖREV - Muhasama kazandıysa tracking'i yap
    useEffect(() => {
        if (result === 'win') {
            updateQuestProgress('WIN_BATTLE', 1);
        }
    }, [result, updateQuestProgress]);

    // 🎮 PREMIUM HAPTIC & SOUND - Sonuç ekranı açıldığında
    useEffect(() => {
        if (result === 'win') {
            // 🏆 Zafer! Epik kutlama!
            haptic.masterCelebration();
            sound.playEpicHarvest();
        } else if (result === 'loss') {
            // 💔 Mağlubiyet - Hafif hüzünlü haptic
            haptic.error();
            setTimeout(() => haptic.warning(), 100);
        } else {
            // 🤝 Berabere - Orta seviye haptic
            haptic.heavy();
            setTimeout(() => haptic.medium(), 80);
        }
    }, [result]);

    // Hide Android Navigation Bar (Immersive Mode)
    // Hide Android Navigation Bar (Immersive Mode)
    useEffect(() => {
        const toggleImmersive = async (enable: boolean) => {
            try {
                if (Platform.OS === 'android') {
                    // Only run on Android to prevent warnings
                    await NavigationBar.setVisibilityAsync(enable ? "hidden" : "visible");
                    if (enable) {
                        await NavigationBar.setBehaviorAsync('overlay-swipe');
                    }
                }
            } catch (e) {
                // Ignore errors
            }
        };

        toggleImmersive(true);

        return () => {
            toggleImmersive(false);
        };
    }, []);

    // Colors based on result
    const getThemeColors = () => {
        switch (result) {
            case 'win': return { primary: '#22c55e', secondary: '#166534', gradient: ['#14532d', '#1a1b2e'] };
            case 'loss': return { primary: '#ef4444', secondary: '#991b1b', gradient: ['#451a1a', '#1a1b2e'] };
            case 'draw': return { primary: '#eab308', secondary: '#a16207', gradient: ['#422006', '#1a1b2e'] };
            default: return { primary: '#eab308', secondary: '#a16207', gradient: ['#422006', '#1a1b2e'] };
        }
    };

    const colors = getThemeColors();

    // Animations
    const scaleAnim = useSharedValue(0.5);
    useEffect(() => {
        scaleAnim.value = withSpring(1);
    }, []);

    const headerAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scaleAnim.value }]
    }));

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={colors.gradient as any}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
            />

            <ScrollView
                style={{ flex: 1, width: '100%' }}
                contentContainerStyle={styles.scrollContent}
            >
                {/* 1. HEADER & RESULT */}
                <Animated.View style={[styles.header, headerAnimatedStyle]}>
                    <View style={styles.iconContainer}>
                        {result === 'win' && <Trophy size={normalize(80)} color="#fbbf24" fill="#fbbf24" style={{ shadowColor: '#fbbf24', shadowRadius: 20, shadowOpacity: 0.8 }} />}
                        {result === 'loss' && <XCircle size={normalize(80)} color="#ef4444" style={{ shadowColor: '#ef4444', shadowRadius: 20, shadowOpacity: 0.6 }} />}
                        {result === 'draw' && <Hash size={normalize(80)} color="#fbbf24" style={{ shadowColor: '#fbbf24', shadowRadius: 20, shadowOpacity: 0.6 }} />}
                    </View>

                    <Text style={[styles.title, { color: result === 'win' ? '#fde047' : '#fff' }]}>
                        {(myInfo?.isDisconnected || opponentInfo?.isDisconnected)
                            ? 'BAĞLANTI KOPTU'
                            : (opponentInfo?.isAbandoned)
                                ? 'RAKİP AYRILDI'
                                : (result === 'win' ? 'ZAFER!' : (result === 'loss' ? 'MAĞLUBİYET' : 'BERABERE'))}
                    </Text>

                    <Text style={styles.subtitle}>
                        {(myInfo?.isDisconnected)
                            ? 'İnternet bağlantın kesildi.'
                            : (opponentInfo?.isDisconnected)
                                ? 'Rakibin bağlantısı koptu.'
                                : (opponentInfo?.isAbandoned)
                                    ? 'Rakip savaşı terk etti.'
                                    : (result === 'win' ? '+1 Kupa Kazandın!' : (result === 'loss' ? 'Daha çok çalışmalısın.' : 'Başabaş mücadele!'))}
                    </Text>
                </Animated.View>

                {/* 2. SCORE CARD */}
                <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.scoreCard}>
                    {/* ME */}
                    <View style={styles.playerColumn}>
                        <View style={[styles.avatarPlaceholder, { borderColor: '#22c55e' }]}>
                            <Text style={styles.avatarText}>{myInfo?.nickname?.[0]?.toUpperCase() || 'B'}</Text>
                        </View>
                        <Text style={styles.scoreValue}>{myScore}</Text>
                        <Text style={styles.playerLabel}>Sen</Text>
                    </View>

                    {/* VS */}
                    <View style={styles.vsColumn}>
                        <Text style={styles.vsText}>VS</Text>
                    </View>

                    {/* OPPONENT */}
                    <View style={styles.playerColumn}>
                        <View style={[styles.avatarPlaceholder, { borderColor: '#ef4444' }]}>
                            <Text style={styles.avatarText}>{opponentInfo?.nickname?.[0]?.toUpperCase() || 'R'}</Text>
                        </View>
                        <Text style={styles.scoreValue}>{opponentScore}</Text>
                        <Text style={styles.playerLabel}>{opponentInfo?.nickname || 'Rakip'}</Text>
                    </View>
                </Animated.View>

                {/* 3. REWARDS */}
                <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.rewardsContainer}>
                    <View style={styles.rewardItem}>
                        <Star size={normalize(24)} color="#fbbf24" fill="#fbbf24" />
                        <Text style={styles.rewardValue}>+{rewards.xp} XP</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.rewardItem}>
                        <Coins size={normalize(24)} color="#fbbf24" fill="#fbbf24" />
                        <Text style={styles.rewardValue}>+{rewards.coin}</Text>
                    </View>
                </Animated.View>

                {/* 4. STATS GRID */}
                <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <CheckCircle2 size={normalize(20)} color="#22c55e" />
                        <Text style={styles.statLabel}>Doğruluk</Text>
                        <Text style={styles.statNumber}>%{safeAccuracy}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Zap size={normalize(20)} color="#3b82f6" fill="#3b82f6" />
                        <Text style={styles.statLabel}>Seri</Text>
                        <Text style={styles.statNumber}>{safeStreak}x</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Clock size={normalize(20)} color="#a855f7" />
                        <Text style={styles.statLabel}>Hız</Text>
                        <Text style={styles.statNumber}>%{safeSpeed}</Text>
                    </View>
                </Animated.View>

                {/* 5. WRONG WORDS SECTION */}
                {wrongWords.length > 0 && (
                    <Animated.View entering={FadeInDown.delay(700).springify()} style={styles.wrongWordsSection}>
                        {/* Header with toggle */}
                        <Pressable 
                            style={styles.wrongWordsHeader}
                            onPress={() => setShowWrongWords(!showWrongWords)}
                        >
                            <View style={styles.wrongWordsHeaderLeft}>
                                <BookOpen size={normalize(20)} color="#ef4444" />
                                <Text style={styles.wrongWordsTitle}>
                                    Yanlış Kelimeler ({wrongWords.length})
                                </Text>
                            </View>
                            {showWrongWords ? (
                                <ChevronUp size={normalize(20)} color="rgba(255,255,255,0.5)" />
                            ) : (
                                <ChevronDown size={normalize(20)} color="rgba(255,255,255,0.5)" />
                            )}
                        </Pressable>

                        {/* Words List */}
                        {showWrongWords && (
                            <View style={styles.wrongWordsList}>
                                {wrongWords.map((word, index) => (
                                    <View key={`${word.wordId || word.wordText}-${index}`} style={styles.wrongWordItem}>
                                        <View style={styles.wrongWordLeft}>
                                            <Text style={styles.wrongWordText}>{word.wordText}</Text>
                                            <Text style={styles.wrongWordCorrect}>
                                                ✓ {word.correctAnswer}
                                            </Text>
                                        </View>
                                        <View style={styles.wrongWordRight}>
                                            <Text style={styles.wrongWordUserAnswer}>
                                                ✗ {word.userAnswer}
                                            </Text>
                                            {word.addedToFarm ? (
                                                <View style={styles.alreadyInFarmBadge}>
                                                    <Text style={styles.alreadyInFarmText}>Tarlada</Text>
                                                </View>
                                            ) : (
                                                <View style={styles.newSeedBadge}>
                                                    <Sprout size={normalize(12)} color="#22c55e" />
                                                    <Text style={styles.newSeedText}>Yeni Tohum</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Motivation Message */}
                        {addedCount > 0 && (
                            <View style={styles.motivationContainer}>
                                <View style={styles.motivationBanner}>
                                    <Sprout size={normalize(24)} color="#22c55e" />
                                    <View style={styles.motivationTextContainer}>
                                        <Text style={styles.motivationText}>
                                            {addedCount} bilmediğin kelime tarlana eklendi çalışman için!
                                        </Text>
                                        <Text style={styles.motivationSlogan}>
                                            🌱 Haydi tohumlarını büyüt!
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* No new seeds - all words already in farm */}
                        {addedCount === 0 && wrongWords.length > 0 && (
                            <View style={styles.motivationContainer}>
                                <View style={[styles.motivationBanner, { borderColor: 'rgba(251, 191, 36, 0.3)' }]}>
                                    <BookOpen size={normalize(24)} color="#fbbf24" />
                                    <View style={styles.motivationTextContainer}>
                                        <Text style={styles.motivationText}>
                                            Bu kelimeler zaten tarlanda var, pratik yapmayı unutma!
                                        </Text>
                                        <Text style={styles.motivationSlogan}>
                                            📚 Tekrar tekrar çalış, ustalaş!
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </Animated.View>
                )}

                {/* 6. PERFECT SCORE MESSAGE */}
                {wrongWords.length === 0 && questions && questions.length > 0 && (
                    <Animated.View entering={FadeInDown.delay(700).springify()} style={styles.perfectScoreContainer}>
                        <View style={styles.perfectScoreBanner}>
                            <Star size={normalize(28)} color="#fbbf24" fill="#fbbf24" />
                            <Text style={styles.perfectScoreText}>
                                Mükemmel! Hiç hata yapmadın! 🎉
                            </Text>
                        </View>
                    </Animated.View>
                )}

                {/* 7. FOOTER ACTIONS (Scrollable) */}
                <Animated.View entering={FadeInUp.delay(800).springify()} style={styles.footer}>
                    <Pressable style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary }]} onPress={onPlayAgain}>
                        <RefreshCw size={normalize(24)} color="#fff" />
                        <Text style={styles.buttonText}>Tekrar Oyna</Text>
                    </Pressable>

                    <Pressable style={[styles.button, styles.secondaryButton]} onPress={onHome}>
                        <Home size={normalize(24)} color="#94a3b8" />
                        <Text style={[styles.buttonText, { color: '#94a3b8' }]}>Ana Menü</Text>
                    </Pressable>
                </Animated.View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    scrollContent: {
        padding: normalize(24),
        alignItems: 'center',
        paddingBottom: normalize(120), // Extra padding at bottom for nav bar
    },
    // ... existing header, iconContainer, title, subtitle, scoreCard, etc ...
    header: {
        alignItems: 'center',
        marginBottom: normalize(40),
        marginTop: normalize(40),
    },
    iconContainer: {
        marginBottom: normalize(16),
        shadowOffset: { width: 0, height: normalize(10) },
        shadowOpacity: 0.5,
        shadowRadius: normalize(20),
        elevation: 10,
    },
    title: {
        fontSize: normalize(42),
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: normalize(8),
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    subtitle: {
        fontSize: normalize(16),
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '500',
    },
    scoreCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: normalize(24),
        padding: normalize(24),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: normalize(24),
    },
    playerColumn: {
        alignItems: 'center',
        flex: 1,
    },
    vsColumn: {
        width: normalize(50),
        alignItems: 'center',
        justifyContent: 'center',
    },
    vsText: {
        fontSize: normalize(20),
        fontWeight: '900',
        color: 'rgba(255,255,255,0.2)',
        fontStyle: 'italic',
    },
    avatarPlaceholder: {
        width: normalize(64),
        height: normalize(64),
        borderRadius: normalize(32),
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: normalize(12),
        borderWidth: 2,
    },
    avatarText: {
        fontSize: normalize(28),
        fontWeight: 'bold',
        color: '#fff',
    },
    scoreValue: {
        fontSize: normalize(32),
        fontWeight: '900',
        color: '#fff',
        marginBottom: 4,
    },
    playerLabel: {
        fontSize: normalize(14),
        color: 'rgba(255,255,255,0.5)',
        fontWeight: '600',
    },
    rewardsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: normalize(16),
        padding: normalize(16),
        width: '100%',
        marginBottom: normalize(24),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    rewardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: normalize(8),
        paddingHorizontal: normalize(16),
    },
    rewardValue: {
        fontSize: normalize(20),
        fontWeight: 'bold',
        color: '#fff',
    },
    divider: {
        width: 1,
        height: normalize(24),
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    statsGrid: {
        flexDirection: 'row',
        gap: normalize(12),
        width: '100%',
        marginBottom: normalize(24), // Add margin bottom to separate from footer
    },
    statBox: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: normalize(16),
        padding: normalize(16),
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    statLabel: {
        fontSize: normalize(12),
        color: 'rgba(255,255,255,0.5)',
        marginBottom: normalize(8),
        marginTop: normalize(8),
        fontWeight: '600',
    },
    statNumber: {
        fontSize: normalize(18),
        fontWeight: 'bold',
        color: '#fff',
    },
    // 🔴 WRONG WORDS SECTION STYLES
    wrongWordsSection: {
        width: '100%',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderRadius: normalize(16),
        marginBottom: normalize(24),
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
        overflow: 'hidden',
    },
    wrongWordsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: normalize(16),
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    wrongWordsHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: normalize(10),
    },
    wrongWordsTitle: {
        fontSize: normalize(16),
        fontWeight: 'bold',
        color: '#fff',
    },
    wrongWordsList: {
        paddingHorizontal: normalize(16),
        paddingBottom: normalize(12),
    },
    wrongWordItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: normalize(12),
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    wrongWordLeft: {
        flex: 1,
        marginRight: normalize(12),
    },
    wrongWordRight: {
        alignItems: 'flex-end',
        gap: normalize(6),
    },
    wrongWordText: {
        fontSize: normalize(16),
        fontWeight: '700',
        color: '#fff',
        marginBottom: normalize(4),
    },
    wrongWordCorrect: {
        fontSize: normalize(13),
        color: '#22c55e',
        fontWeight: '500',
    },
    wrongWordUserAnswer: {
        fontSize: normalize(13),
        color: '#ef4444',
        fontWeight: '500',
        textDecorationLine: 'line-through',
    },
    newSeedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: normalize(4),
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        paddingHorizontal: normalize(8),
        paddingVertical: normalize(4),
        borderRadius: normalize(8),
    },
    newSeedText: {
        fontSize: normalize(11),
        color: '#22c55e',
        fontWeight: '600',
    },
    alreadyInFarmBadge: {
        backgroundColor: 'rgba(251, 191, 36, 0.15)',
        paddingHorizontal: normalize(8),
        paddingVertical: normalize(4),
        borderRadius: normalize(8),
    },
    alreadyInFarmText: {
        fontSize: normalize(11),
        color: '#fbbf24',
        fontWeight: '600',
    },
    // 🌱 MOTIVATION CONTAINER STYLES
    motivationContainer: {
        paddingHorizontal: normalize(16),
        paddingBottom: normalize(16),
    },
    motivationBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: normalize(12),
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        padding: normalize(14),
        borderRadius: normalize(12),
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.3)',
    },
    motivationTextContainer: {
        flex: 1,
    },
    motivationText: {
        fontSize: normalize(13),
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '500',
        marginBottom: normalize(4),
    },
    motivationSlogan: {
        fontSize: normalize(15),
        color: '#22c55e',
        fontWeight: '700',
    },
    // ⭐ PERFECT SCORE STYLES
    perfectScoreContainer: {
        width: '100%',
        marginBottom: normalize(24),
    },
    perfectScoreBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: normalize(12),
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        padding: normalize(16),
        borderRadius: normalize(16),
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.3)',
    },
    perfectScoreText: {
        fontSize: normalize(16),
        color: '#fbbf24',
        fontWeight: '700',
    },
    footer: {
        width: '100%',
        flexDirection: 'row',
        gap: normalize(12),
        marginTop: normalize(12),
        // Removed fixed positioning styles
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: normalize(18),
        borderRadius: normalize(16),
        gap: normalize(8),
    },
    primaryButton: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    secondaryButton: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    buttonText: {
        fontSize: normalize(16),
        fontWeight: 'bold',
        color: '#fff',
    }
});
