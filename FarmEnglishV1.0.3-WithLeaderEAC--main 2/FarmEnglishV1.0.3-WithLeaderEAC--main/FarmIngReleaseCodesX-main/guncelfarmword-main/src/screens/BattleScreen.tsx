import { BattleResultScreen } from './BattleResultScreen';
/**

 * BattleScreen - Real-time Quiz Battle

 * FarmEnglish Battle Mode

 * Refactored with QuizScreen UI patterns + Sync Fix + Hook Rules Fix

 */

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';

import {

    View,

    Text,

    StyleSheet,

    Pressable,

    Animated,

    Dimensions,

    Easing,

    ActivityIndicator,

    useWindowDimensions,

    ScrollView,

    TouchableOpacity,

    Alert,

    AppState,

} from 'react-native';

import NetInfo from '@react-native-community/netinfo';

import { useNavigation } from '@react-navigation/native';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { SafeAreaView } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';

import { Image } from 'expo-image';

import { X, Zap, Flame, Star, Trophy, Swords, Crown, Check, AlertCircle } from 'lucide-react-native';

import ConfettiCannon from 'react-native-confetti-cannon';

import { useFarmStore } from '../store/farmStore';

import { haptic, sound } from '../utils/sound';

import {

    joinMatchmaking,

    leaveMatchmaking,

    findOpponent,

    listenToBattle,

    generateBattleQuestions,

    createBattleRoom,

    updateBattleHeartbeat,

    notifyMatch,

    listenToMatchmaking,

    submitAnswer, // Yeni: Atomic cevap gönderme

    handleDisconnect, // Yeni: Disconnect yönetimi

    finishBattleWithRewards, // Yeni: Ödül dağıtımı

    abandonBattle,

    getBattleFresh, // Yeni: Settle sonrası fresh data

    sendBattleEmoji, // 🎭 Emoji gönderme

    type BattleRoom,

} from '../utils/firebaseBattle';

// ğŸ“± RESPONSIVE SYSTEM - QuizScreen'den alındı

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const getScreenType = () => {

    if (SCREEN_HEIGHT < 700) return 'small';      // 4.7" iPhone SE

    if (SCREEN_HEIGHT < 850) return 'medium';     // Normal telefonlar

    if (SCREEN_HEIGHT < 1100) return 'large';     // Büyük telefonlar

    return 'tablet';                              // Tabletler

};

const SCREEN_TYPE = getScreenType();

// Responsive değerler

const RS = {

    // Font sizes

    questionFont: { small: 22, medium: 26, large: 32, tablet: 42 }[SCREEN_TYPE],

    optionFont: { small: 14, medium: 16, large: 17, tablet: 20 }[SCREEN_TYPE],

    labelFont: { small: 9, medium: 11, large: 12, tablet: 14 }[SCREEN_TYPE],

    comboFont: { small: 10, medium: 11, large: 12, tablet: 14 }[SCREEN_TYPE],

    // Paddings

    headerPadding: { small: 10, medium: 12, large: 16, tablet: 24 }[SCREEN_TYPE],

    questionPaddingV: { small: 20, medium: 30, large: 40, tablet: 50 }[SCREEN_TYPE],

    optionPaddingV: { small: 12, medium: 14, large: 16, tablet: 18 }[SCREEN_TYPE],

    optionPaddingH: { small: 14, medium: 16, large: 18, tablet: 24 }[SCREEN_TYPE],

    containerPaddingH: { small: 12, medium: 14, large: 16, tablet: 32 }[SCREEN_TYPE],

    // Gaps

    optionGap: { small: 8, medium: 10, large: 12, tablet: 16 }[SCREEN_TYPE],

    headerGap: { small: 8, medium: 10, large: 12, tablet: 20 }[SCREEN_TYPE],

    // Sizes

    exitButtonSize: { small: 28, medium: 32, large: 36, tablet: 44 }[SCREEN_TYPE],

    timerHeight: { small: 4, medium: 5, large: 6, tablet: 8 }[SCREEN_TYPE],

    comboIconSize: { small: 10, medium: 12, large: 14, tablet: 18 }[SCREEN_TYPE],

    resultIconSize: { small: 24, medium: 28, large: 32, tablet: 40 }[SCREEN_TYPE],

    // Result screen

    resultEmoji: { small: 48, medium: 64, large: 80, tablet: 120 }[SCREEN_TYPE],

    resultTitle: { small: 22, medium: 28, large: 36, tablet: 48 }[SCREEN_TYPE],

    statNumber: { small: 26, medium: 36, large: 48, tablet: 64 }[SCREEN_TYPE],

    statLabel: { small: 11, medium: 13, large: 16, tablet: 20 }[SCREEN_TYPE],

    // Layout

    optionMaxWidth: { small: '100%', medium: '100%', large: '100%', tablet: 600 }[SCREEN_TYPE],

};

const TIMER_DURATION = 10000;

const QUESTION_COUNT = 10;

const isSmallScreen = SCREEN_TYPE === 'small';

// Timer Bar Component (QuizScreen stili)

const TimerBar = memo(({ duration, onTimeUp, isPaused }: { duration: number; onTimeUp: () => void; isPaused: boolean }) => {

    const widthAnim = useRef(new Animated.Value(1)).current;

    const animationRef = useRef<Animated.CompositeAnimation | null>(null);

    useEffect(() => {

        // Reset animation on mount/prop change

        widthAnim.setValue(1);

        if (isPaused) {

            animationRef.current?.stop();

            return;

        }

        animationRef.current = Animated.timing(widthAnim, {

            toValue: 0,

            duration,

            easing: Easing.linear,

            useNativeDriver: false,

        });

        animationRef.current.start(({ finished }) => {

            if (finished) onTimeUp();

        });

        return () => animationRef.current?.stop();

    }, [isPaused, duration]);

    const backgroundColor = widthAnim.interpolate({

        inputRange: [0, 0.3, 0.6, 1],

        outputRange: ['#ff4444', '#ff8800', '#f59e0b', '#22c55e'],

    });

    return (

        <View style={[styles.timerBarContainer, { height: RS.timerHeight }]}>

            <Animated.View

                style={[

                    styles.timerBarFill,

                    {

                        width: widthAnim.interpolate({

                            inputRange: [0, 1],

                            outputRange: ['0%', '100%'],

                        }),

                        backgroundColor,

                    },

                ]}

            />

        </View>

    );

});

// Option Button Component (QuizScreen stili + Responsive)

const OptionButton = memo(({

    text,

    index,

    isSelected,

    isCorrect,

    showResult,

    disabled,

    onPress,

}: {

    text: string;

    index: number;

    isSelected: boolean;

    isCorrect: boolean;

    showResult: boolean;

    disabled: boolean;

    onPress: () => void;

}) => {

    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = useCallback(() => {

        haptic.selection();

        Animated.spring(scaleAnim, {

            toValue: 0.96,

            friction: 8,

            tension: 200,

            useNativeDriver: true,

        }).start();

    }, []);

    const handlePressOut = useCallback(() => {

        Animated.spring(scaleAnim, {

            toValue: 1,

            friction: 8,

            tension: 200,

            useNativeDriver: true,

        }).start();

    }, []);

    const backgroundColor = useMemo(() => {

        if (!showResult) return 'rgba(255, 255, 255, 0.08)';

        if (isCorrect) return 'rgba(52, 199, 89, 0.8)'; // Green

        if (isSelected) return 'rgba(255, 69, 58, 0.8)'; // Red

        return 'rgba(255, 255, 255, 0.08)';

    }, [showResult, isCorrect, isSelected]);

    const borderColor = useMemo(() => {

        if (!showResult) return 'rgba(255, 255, 255, 0.12)';

        if (isCorrect) return '#34c759';

        if (isSelected) return '#ff453a';

        return 'rgba(255, 255, 255, 0.12)';

    }, [showResult, isCorrect, isSelected]);

    return (

        <Animated.View style={{

            transform: [{ scale: scaleAnim }],

            width: '100%',

            maxWidth: RS.optionMaxWidth as any,

            alignSelf: 'center',

            marginBottom: RS.optionGap

        }}>

            <Pressable

                onPress={disabled ? undefined : onPress}

                onPressIn={handlePressIn}

                onPressOut={handlePressOut}

                style={[

                    styles.optionButton,

                    {

                        backgroundColor,

                        borderColor,

                        paddingVertical: RS.optionPaddingV,

                        paddingHorizontal: RS.optionPaddingH,

                    }

                ]}

                disabled={disabled}

            >

                <Text style={[styles.optionText, { fontSize: RS.optionFont }]}>{text}</Text>

                {showResult && isCorrect && (

                    <View style={[styles.resultIcon, { backgroundColor: 'rgba(52, 199, 89, 0.2)', width: RS.resultIconSize, height: RS.resultIconSize }]}>

                        <Check color="#34c759" size={RS.resultIconSize * 0.7} strokeWidth={3} />

                    </View>

                )}

                {showResult && isSelected && !isCorrect && (

                    <View style={[styles.resultIcon, { backgroundColor: 'rgba(255, 69, 58, 0.2)', width: RS.resultIconSize, height: RS.resultIconSize }]}>

                        <X color="#ff453a" size={RS.resultIconSize * 0.7} strokeWidth={3} />

                    </View>

                )}

            </Pressable>

        </Animated.View>

    );

});

// Battle Header with Responsive Layout

const BattleHeader = memo(({

    myScore,

    opponentScore,

    myProgress,

    opponentProgress,

    opponentNickname,

    myNickname,

    onExit,

}: {

    myScore: number;

    opponentScore: number;

    myProgress: number;

    opponentProgress: number;

    opponentNickname: string;

    myNickname: string;

    onExit: () => void;

}) => {

    // Motivational system

    const scoreDiff = myScore - opponentScore;

    let message = 'VS';

    let messageColor = '#8b5cf6';

    if (scoreDiff >= 200) { message = '🔥 Harika!'; messageColor = '#22c55e'; }

    else if (scoreDiff > 0) { message = '👍 Öndesin'; messageColor = '#22c55e'; }

    else if (scoreDiff <= -200) { message = '😰 Hızlan!'; messageColor = '#ef4444'; }

    else if (scoreDiff < 0) { message = '⚡ Yakala!'; messageColor = '#f59e0b'; }

    return (

        <View style={[styles.battleHeader, { paddingHorizontal: RS.headerPadding, gap: RS.headerGap }]}>

            {/* Player 1 (Left) & Exit */}

            <View style={styles.playerSection}>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>

                    <TouchableOpacity onPress={onExit} style={styles.exitButtonHeader}>

                        <X color="#ef4444" size={24} />

                    </TouchableOpacity>

                    <View style={styles.playerInfo}>

                        <Text style={[styles.playerName, { fontSize: RS.labelFont + 2 }]} numberOfLines={1}>{myNickname}</Text>

                        <Text style={[styles.playerScore, { fontSize: RS.labelFont + 6 }]}>{myScore}</Text>

                    </View>

                </View>

                <View style={styles.progressBarContainer}>

                    <View style={[styles.progressBar, styles.myProgressBar, { width: `${(myProgress / QUESTION_COUNT) * 100}%` }]} />

                </View>

                <Text style={[styles.progressText, { fontSize: RS.labelFont }]}>{myProgress}/{QUESTION_COUNT}</Text>

            </View>

            {/* Center VS */}

            <View style={styles.vsContainer}>

                <Swords color="#8b5cf6" size={RS.exitButtonSize * 0.8} />

                <Text style={[styles.vsText, { color: messageColor, fontSize: RS.labelFont }]}>{message}</Text>

            </View>

            {/* Player 2 (Right) */}

            <View style={[styles.playerSection, styles.opponentSection]}>

                <View style={styles.playerInfo}>

                    <Text style={[styles.playerName, styles.opponentName, { fontSize: RS.labelFont + 2 }]} numberOfLines={1}>{opponentNickname}</Text>

                    <Text style={[styles.playerScore, styles.opponentScore, { fontSize: RS.labelFont + 6 }]}>{opponentScore}</Text>

                </View>

                <View style={styles.progressBarContainer}>

                    <View style={[styles.progressBar, styles.opponentProgressBar, { width: `${(opponentProgress / QUESTION_COUNT) * 100}%` }]} />

                </View>

                <Text style={[styles.progressText, { textAlign: 'right', fontSize: RS.labelFont }]}>{opponentProgress}/{QUESTION_COUNT}</Text>

            </View>

        </View>

    );

});

export const BattleScreen: React.FC<any> = ({ navigation, route }) => {

    // Route params

    const mode = route?.params?.mode;

    const routeBattleId = route?.params?.battleId;

    // Store state

    const battleState = useFarmStore((s) => s.battleState);

    const battleQuestions = useFarmStore((s) => s.battleQuestions);

    const battleScore = useFarmStore((s) => s.battleScore);

    const opponentInfo = useFarmStore((s) => s.opponentInfo);

    const user = useFarmStore((s) => s.user);

    const nickname = useFarmStore((s) => s.nickname);

    const level = useFarmStore((s) => s.level);

    const farm = useFarmStore((s) => s.farm);

    const pool = useFarmStore((s) => s.pool);

    const isAuthenticated = useFarmStore((s) => s.isAuthenticated);

    // Actions

    const setBattleState = useFarmStore((s) => s.setBattleState);

    const submitBattleAnswer = useFarmStore((s) => s.submitBattleAnswer);

    const cancelMatchmaking = useFarmStore((s) => s.cancelMatchmaking);

    const endBattle = useFarmStore((s) => s.endBattle);

    const startMatchmaking = useFarmStore((s) => s.startMatchmaking);

    const resetBattle = useFarmStore((s) => s.resetBattle);

    // Store actions

    const updateRemoteOpponentProgress = useFarmStore((s) => s.updateRemoteOpponentProgress);

    // Local state

    const [finalBattleData, setFinalBattleData] = useState<BattleRoom | null>(null); // For detailed report

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const [showResult, setShowResult] = useState(false);

    const [timerKey, setTimerKey] = useState(0);

    const [finishReason, setFinishReason] = useState<string>('Savaş Tamamlandı!');

    // 🎭 Emoji sistemi
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [receivedEmoji, setReceivedEmoji] = useState<string | null>(null);
    const [emojiCooldown, setEmojiCooldown] = useState(false);
    const lastEmojiTimestamp = useRef(0);
    const emojiOpacity = useRef(new Animated.Value(0)).current;
    const emojiScale = useRef(new Animated.Value(0)).current;
    const BATTLE_EMOJIS = ['😎', '🔥', '😤', '🤔', '😂', '👍', '💪', '🎉'];

    // 🔥 HOOK MOVED TO TOP LEVEL: Matchmaking Animation

    const scaleAnim = useRef(new Animated.Value(1)).current;

    const questionStartTime = useRef(Date.now());

    const isExiting = useRef(false); // To prevent updates after leaving
    const isFinishedProcessing = useRef(false); // 🛡️ Prevent multiple finish processings
    const endBattleCalledRef = useRef(false); // 🛡️ Prevent multiple endBattle calls

    const battleRef = useRef<BattleRoom | null>(null); // For Dead Man's Switch mount to prevent stale state

    // 🛡️ Safe endBattle wrapper - prevents multiple calls
    const safeEndBattle = useCallback((result: 'win' | 'loss' | 'draw', oppScore: number, isDisconnect: boolean = false) => {
        if (endBattleCalledRef.current) {
            console.log('[Battle] 🛡️ endBattle already called, ignoring duplicate');
            return;
        }
        endBattleCalledRef.current = true;
        endBattle(result, oppScore, isDisconnect);
    }, [endBattle]);

    // Setup cleanup on unmount & conditional reset on mount

    useEffect(() => {

        // Safety: If we enter screen with stale 'matched'/'finished' state, reset it.

        // But if it is 'searching' (from Menu) or 'idle', keep it to allow auto-start.

        const currentState = useFarmStore.getState().battleState;

        if (currentState === 'matched' || currentState === 'inProgress' || currentState === 'finished') {

            resetBattle();

        }
        // Reset guards on mount
        endBattleCalledRef.current = false;
        isFinishedProcessing.current = false;

        return () => {

            // Cleanup on unmount

            isExiting.current = true;

            resetBattle(); // Reset state when leaving the screen

        };

    }, []);

    // Helper for safe exit

    const handleGoBack = useCallback(() => {

        resetBattle();

        navigation.goBack();

    }, [resetBattle, navigation]);

    // 🎭 Emoji gönderme fonksiyonu
    const handleSendEmoji = useCallback(async (emoji: string) => {
        if (emojiCooldown || battleState !== 'inProgress') return;

        const battleId = useFarmStore.getState().battleId;
        if (!battleId || !user) return;

        setShowEmojiPicker(false);
        setEmojiCooldown(true);
        haptic.medium();

        await sendBattleEmoji(battleId, user.odId, emoji);

        // 3 saniye cooldown
        setTimeout(() => setEmojiCooldown(false), 3000);
    }, [emojiCooldown, battleState, user]);

    // 🎭 Gelen emoji animasyonu
    const showEmojiAnimation = useCallback((emoji: string) => {
        setReceivedEmoji(emoji);
        emojiOpacity.setValue(0);
        emojiScale.setValue(0.5);

        Animated.parallel([
            Animated.timing(emojiOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.spring(emojiScale, {
                toValue: 1.2,
                friction: 4,
                tension: 100,
                useNativeDriver: true,
            }),
        ]).start(() => {
            // 1.5 saniye sonra kaybol
            setTimeout(() => {
                Animated.parallel([
                    Animated.timing(emojiOpacity, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.timing(emojiScale, {
                        toValue: 0.5,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                ]).start(() => setReceivedEmoji(null));
            }, 1500);
        });
    }, [emojiOpacity, emojiScale]);

    // Exit Logic

    const handleExit = useCallback(() => {

        haptic.medium();

        if (battleState === 'inProgress') {

            Alert.alert(

                'Savaştan Çık',

                'Oyundan çıkarsan hükmen mağlup sayılacaksın. Emin misin?',

                [

                    { text: 'İptal', style: 'cancel' },

                    {

                        text: 'Çık',

                        style: 'destructive',

                        onPress: async () => {

                            isExiting.current = true; // Stop listening immediately

                            // Firebase'e bildir (Kasıtlı Terk)

                            const currentBattleId = useFarmStore.getState().battleId;
                            const currentUser = useFarmStore.getState().user;

                            if (currentBattleId && currentUser?.odId) {

                                // ID format: battle_HOSTID_TIMESTAMP or battle_ID1_vs_ID2 (old)

                                const parts = currentBattleId.split('_');
                                const hostId = parts.slice(1, -1).join('_');
                                const isHost = hostId === currentUser.odId;

                                // Fire-and-forget: Do not await, exit immediately

                                abandonBattle(currentBattleId, currentUser.odId, isHost).catch(e => console.error('Abandon error:', e));

                            }

                            // Yerel olarak bitir (Kaybettin)

                            setFinishReason('Pes Ettin!'); // Prevent "Win" flash text

                            setFinalBattleData({ status: 'abandoned', abandonedBy: currentUser?.odId || '' } as any); // Force loss logic

                            safeEndBattle('loss', opponentInfo?.currentScore || 0);

                            navigation.goBack();

                        }

                    }

                ]

            );

        } else {

            if (battleState === 'matched') {

                // If matched, we must abandon because opponent might be joining

                const currentBattleId = useFarmStore.getState().battleId;
                const currentUser = useFarmStore.getState().user;

                if (currentBattleId && currentUser?.odId) {

                    console.log('[Battle] Matched state exit -> Abandoning');

                    // Logic: If I am the host (my ID is first after 'battle_'), I must abandon.

                    const isHost = currentBattleId.startsWith(`battle_${currentUser.odId}`);

                    abandonBattle(currentBattleId, currentUser.odId, isHost).catch(e => console.error('Abandon error:', e));

                }

                cancelMatchmaking();

            } else if (battleState === 'searching') {

                cancelMatchmaking();

            }

            navigation.goBack();

        }

    }, [battleState, navigation, safeEndBattle, cancelMatchmaking, opponentInfo, user]);

    // Current question

    const currentQuestion = battleQuestions[currentQuestionIndex];

    // ===============================

    // âš”ï¸ INITIALIZATION & MATCHMAKING

    // ===============================

    useEffect(() => {

        if (mode === 'friendBattle' && routeBattleId) {

            // Friend battle logic...

            const loadBattle = () => {

                const unsubscribe = listenToBattle(routeBattleId, (battle) => {

                    if (isExiting.current) return;

                    useFarmStore.getState().setBattleData({

                        battleId: battle.id,

                        questions: battle.questions,

                        opponentInfo: {

                            odId: battle.hostId === user?.odId ? battle.guestId || '' : battle.hostId,

                            nickname: battle.hostId === user?.odId ? battle.guestNickname || 'Rakip' : battle.hostNickname,

                            level: level,

                        },

                    });

                    if (battle.status === 'abandoned') {
                        // 🛡️ Prevent infinite loop: only handle abandoned once
                        // Also ignore if battle is already finished (result screen is showing or processing)
                        if (isExiting.current || isFinishedProcessing.current) return;
                        const currentBattleState = useFarmStore.getState().battleState;
                        if (currentBattleState === 'finished') return; // Don't show abandoned alert on result screen
                        isExiting.current = true;

                        console.log('[FriendBattle] Oda kapandı/terk edildi.');

                        Alert.alert(

                            'Savaş İptal',

                            'Rakip odadan ayrıldı veya savaş iptal edildi.',

                            [{

                                text: 'Tamam',

                                onPress: () => {

                                    resetBattle();

                                    navigation.goBack();

                                }

                            }],

                            { cancelable: false }

                        );

                        return;

                    }

                    if (battle.status === 'inProgress') setBattleState('inProgress');

                    else if (battle.status === 'ready') setBattleState('matched');

                    // 🏁 FINISHED: Handle battle completion for private room mode
                    else if (battle.status === 'finished') {
                        // 🛡️ Prevent multiple executions
                        if (isFinishedProcessing.current) return;
                        isFinishedProcessing.current = true;

                        console.log('[FriendBattle] Battle finished, showing result screen...');

                        // 🛡️ IMMEDIATELY set state to finished to prevent UI flash
                        setBattleState('finished');

                        // Settle delay + fresh data fetch (same logic as quick match)
                        console.log('[FriendBattle] ⏳ Starting 2.5s settle delay...');
                        setTimeout(async () => {
                            try {
                                console.log('[FriendBattle] ⏳ Settle delay complete, fetching fresh data...');

                                const freshBattle = await getBattleFresh(battle.id);
                                console.log('[FriendBattle] 📥 Fresh battle fetched:', freshBattle ? 'success' : 'null (using listener data)');

                                const finalData = freshBattle || battle;

                                // Calculate scores from answers
                                const calculateScore = (answers: any[] = []) => (answers || []).filter((a: any) => a.isCorrect).length * 100;
                                const finalHostScore = calculateScore(finalData.hostAnswers) || finalData.hostScore || 0;
                                const finalGuestScore = calculateScore(finalData.guestAnswers) || finalData.guestScore || 0;

                                const isUserHost = user?.odId === finalData.hostId;
                                const finalWinnerId: string | null = finalData.winnerId ?? null;

                                console.log(`[FriendBattle] 📊 FINAL RESULT - Host: ${finalHostScore}, Guest: ${finalGuestScore}, Winner: ${finalWinnerId || 'DRAW'}`);

                                const authoritativeFinalData = {
                                    ...finalData,
                                    hostScore: finalHostScore,
                                    guestScore: finalGuestScore,
                                    winnerId: finalWinnerId
                                };

                                setFinalBattleData(authoritativeFinalData);

                                const freshOppScore = isUserHost ? finalGuestScore : finalHostScore;

                                let result: 'win' | 'loss' | 'draw' = 'draw';
                                if (finalWinnerId) {
                                    if (finalWinnerId === user?.odId) result = 'win';
                                    else result = 'loss';
                                }

                                console.log('[FriendBattle] 🏁 Calling endBattle with result:', result);
                                safeEndBattle(result, freshOppScore || 0, false);
                            } catch (err) {
                                console.error('[FriendBattle] ❌ Error in settle delay:', err);
                                // Fallback: use listener data directly
                                setFinalBattleData(battle);
                                safeEndBattle('draw', 0, false);
                            }
                        }, 2500);
                    }

                }, (error) => {
                    // 🛡️ Safe error handler - don't crash the app
                    console.error('[FriendBattle] Listener error:', error?.message || error);
                    if (!isExiting.current) {
                        Alert.alert('Bağlantı Hatası', 'Savaş verisi alınamadı. Lütfen tekrar deneyin.', [{ text: 'Tamam', onPress: () => { resetBattle(); navigation.goBack(); } }], { cancelable: false });
                    }
                });

                return unsubscribe;

            };

            const unsubscribe = loadBattle();

            return () => {

                if (unsubscribe) unsubscribe();

            };

        } else if (battleState === 'idle') {

            startMatchmaking();

        }

    }, [mode, routeBattleId]);

    // Matchmaking Animation Loop - Always runs but effect depends on state

    useEffect(() => {

        if (battleState === 'searching' || battleState === 'matched') {

            const anim = Animated.loop(Animated.sequence([

                Animated.timing(scaleAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),

                Animated.timing(scaleAnim, { toValue: 1, duration: 800, useNativeDriver: true })

            ]));

            anim.start();

            return () => anim.stop();

        } else {

            scaleAnim.setValue(1);

        }

    }, [battleState]);

    // Real Matchmaking Logic (Optimized: Finder is Host & Listener)

    useEffect(() => {

        if (battleState !== 'searching' || !user?.odId || !isAuthenticated) return;

        let isCancelled = false;

        let isMatchFound = false;

        let searchInterval: NodeJS.Timeout | undefined;

        let unsubscribeMatchmaking: () => void; // Listener unsubscribe

        const startRealMatchmaking = async () => {

            try {

                // ğŸ›‘ RACE CONDITION PREVENTION: Wait for any previous cleanup to finish

                await new Promise(resolve => setTimeout(resolve, 500));

                if (isCancelled) return;

                await joinMatchmaking(user.odId, nickname || user.nickname, level);

                // 👍‚ 1. PASIF: Biri beni bulup davet etti mi? (Listener)

                unsubscribeMatchmaking = listenToMatchmaking(user.odId, async (battleId) => {

                    if (isCancelled || !battleId) return;

                    // 🛡️ RACE CONDITION HANDLING (Tie-Breaker)
                    // If we already found a match (as Host), we have a conflict.
                    if (isMatchFound) {
                        // Conflict resolution: Priority to the user with the LARGER odId to be Host.
                        // If incoming invite is from a Larger ID, we yield (abandon our host attempt and join them).
                        // If incoming invite is from a Smaller ID, we ignore (they will yield and join us).

                        try {
                            const incomingHostId = battleId.split('_')[1];
                            const myId = user.odId;

                            if (incomingHostId > myId) {
                                console.log(`[Matchmaking] Race condition: Yielding to larger ID (${incomingHostId} > ${myId}). Abandoning local host.`);
                                // Stop our hosting logic
                                if (searchInterval) clearInterval(searchInterval);
                                // We need to cancel our created battle? 
                                // Ideally yes, but we might just overwrite state. 
                                // Proceed to join the incoming battle.
                            } else {
                                console.log(`[Matchmaking] Race condition: Ignoring invite from smaller ID (${incomingHostId} < ${myId}). Keeping local host.`);
                                return;
                            }
                        } catch (e) {
                            console.error('Error parsing battleId for tie-breaker:', e);
                            return; // Fallback to sticking with our choice
                        }
                    }

                    console.log('[Matchmaking] Davet alındı (Joining):', battleId);

                    isMatchFound = true; // Diğer aramayı durdur, başarı

                    if (searchInterval) clearInterval(searchInterval);

                    // 🚨 HEMEN matchmaking'den çık - race condition önleme
                    await leaveMatchmaking(user!.odId);

                    // Odaya katıl (GUEST veya HOST fark etmez, davet edilen odaya girer)
                    try {
                        const { doc, getDoc, updateDoc, serverTimestamp, onSnapshot } = await import('firebase/firestore');
                        const { db } = await import('../utils/firebaseBattle');

                        const battleRef = doc(db, 'battles', battleId);
                        const battleSnap = await getDoc(battleRef);

                        if (!battleSnap.exists()) {
                            console.warn('[Matchmaking] Battle doc does not exist, ignoring invite');
                            isMatchFound = false;
                            return;
                        }

                        if (battleSnap.exists()) {
                            const battleData = battleSnap.data();

                            // 🛡️ Guard: questions must exist
                            if (!battleData?.questions || !Array.isArray(battleData.questions) || battleData.questions.length === 0) {
                                console.error('[Matchmaking] Battle has no questions, ignoring');
                                isMatchFound = false;
                                return;
                            }

                            // Store güncelle
                            useFarmStore.getState().setBattleData({
                                battleId: battleId,
                                questions: battleData.questions,
                                opponentInfo: {
                                    odId: battleData.hostId === user!.odId ? (battleData.guestId || 'unknown') : battleData.hostId,
                                    nickname: battleData.hostId === user!.odId ? (battleData.guestNickname || 'Rakip') : battleData.hostNickname,
                                    level: 0 // Level verisi room'da yoksa 0 (sonra sync olabilir)
                                }
                            });

                            // Odaya GUEST olarak kaydol (Eğer ben Host değilsem)
                            if (battleData.hostId !== user!.odId) {
                                await updateDoc(battleRef, {
                                    guestId: user!.odId,
                                    guestNickname: nickname || user!.nickname,
                                    guestLastActiveAt: serverTimestamp(),
                                    status: 'inProgress',
                                    startedAt: serverTimestamp()
                                });
                            }

                        }

                        setBattleState('matched');


                        // Guest Wait for Sync (2s)

                        let safetyUnsubscribe: () => void;

                        let safetyTimeout: NodeJS.Timeout;

                        const checkBattleStatus = () => {

                            safetyUnsubscribe = onSnapshot(doc(db, 'battles', battleId), (snap: any) => {

                                if (isCancelled || isExiting.current) {

                                    if (safetyUnsubscribe) safetyUnsubscribe();

                                    return;

                                }

                                const data = snap.data();

                                if (!snap.exists() || data?.status === 'abandoned') {

                                    console.log('[Matchmaking] Oda countdown sırasında kapandı (Guest detected via Listener).');

                                    if (safetyUnsubscribe) safetyUnsubscribe();

                                    if (safetyTimeout) clearTimeout(safetyTimeout);

                                    Alert.alert(

                                        'İptal',

                                        'Rakip eşleşmeyi iptal etti.',

                                        [

                                            {

                                                text: 'Tamam',

                                                onPress: () => {

                                                    resetBattle();

                                                    navigation.goBack();

                                                }

                                            }

                                        ],

                                        { cancelable: false }

                                    );

                                }

                            });

                            // Fallback timeout to proceed if no cancellation

                            safetyTimeout = setTimeout(() => {

                                if (safetyUnsubscribe) safetyUnsubscribe();

                                if (!isCancelled && !isExiting.current) {

                                    setBattleState('inProgress');

                                }

                            }, 2000);

                        };

                        checkBattleStatus();

                    } catch (e) { console.error('Davet katılma hatası:', e); }

                }, (error: any) => {
                    console.error('[Matchmaking] Listener error:', error);
                    if (!isCancelled && !isExiting.current) {
                        cancelMatchmaking();
                        Alert.alert('Bağlantı Hatası', 'Eşleşme dinlenirken hata oluştu. Tekrar deneyin.', [
                            { text: 'Tamam', onPress: () => navigation.goBack() }
                        ]);
                    }
                });

                // ğŸ” 2. AKTIF: Ben birini bulayım (Search)

                // ğŸ” 2. AKTIF: Ben birini bulayım (Search)

                let isFinding = false;

                searchInterval = setInterval(async () => {

                    if (isCancelled || isMatchFound || isFinding) return;

                    isFinding = true;

                    const opponent = await findOpponent(user!.odId, level);

                    if (opponent && !isCancelled && !isMatchFound) {

                        console.log('[Matchmaking] Rakip bulundu (Aktif):', opponent.nickname);

                        // Odayı Kur (HOST benim)

                        const battleId = `battle_${user!.odId}_${Date.now()}`; // Unique ID

                        const allWords = [...farm, ...pool].map(w => ({ id: w.id, text: w.text, meaning: w.meaning }));

                        const questions = generateBattleQuestions(allWords, 10);

                        // 🛡️ Guard: questions must be valid
                        if (!questions || questions.length === 0) {
                            console.error('[Matchmaking] No questions generated, cannot create battle');
                            isFinding = false;
                            return;
                        }

                        try {

                            const { doc, setDoc, serverTimestamp, deleteDoc, onSnapshot, getDoc } = await import('firebase/firestore');

                            const { db } = await import('../utils/firebaseBattle');

                            // Oda oluştur

                            const battleRef = doc(db, 'battles', battleId);

                            await setDoc(battleRef, {

                                id: battleId,

                                roomCode: Math.random().toString(36).substring(2, 8).toUpperCase(),

                                hostId: user!.odId,

                                hostNickname: nickname || user!.nickname,

                                guestId: null,

                                guestNickname: null,

                                status: 'waiting',

                                questions,

                                hostScore: 0, guestScore: 0, hostProgress: 0, guestProgress: 0,

                                hostLastActiveAt: serverTimestamp(),

                                createdAt: serverTimestamp(),

                            });

                            // Rakibe Haber Ver (Notify) - Başarılı mı?

                            const notifySuccess = await notifyMatch(opponent.odId, battleId);

                            if (!notifySuccess) {

                                console.log('[Matchmaking] Rakip düşmüş, oda siliniyor ve aramaya devam ediliyor...');

                                await deleteDoc(battleRef);

                                isFinding = false; // Loop DEVAM ETSİN

                                return;

                            }

                            // BAÅARILI - Aramayı durdur

                            clearInterval(searchInterval);

                            isMatchFound = true;

                            // Store güncelle

                            useFarmStore.getState().setBattleData({

                                battleId: battleId,

                                questions,

                                opponentInfo: { odId: opponent.odId, nickname: opponent.nickname, level: opponent.level }

                            });

                            setBattleState('matched');

                            await leaveMatchmaking(user!.odId);

                            let safetyUnsubscribe: () => void;

                            let safetyTimeout: NodeJS.Timeout;

                            // ğŸš¨ CRITICAL: Detect if Guest abandons immediately

                            safetyUnsubscribe = onSnapshot(battleRef, (snap) => {

                                const data = snap.data();

                                if (data?.status === 'abandoned' && !isCancelled && !isExiting.current) {

                                    console.log('[Matchmaking] Host detected abandonment by Guest during countdown.');

                                    if (safetyUnsubscribe) safetyUnsubscribe();

                                    if (safetyTimeout) clearTimeout(safetyTimeout);

                                    Alert.alert(

                                        'İptal',

                                        'Rakip eşleşmeyi iptal etti.',

                                        [{

                                            text: 'Tamam',

                                            onPress: () => {

                                                resetBattle();

                                                navigation.goBack();

                                            }

                                        }],

                                        { cancelable: false }

                                    );

                                }

                            });

                            safetyTimeout = setTimeout(async () => {

                                if (safetyUnsubscribe) safetyUnsubscribe();

                                // Check if user cancelled during countdown

                                if (isCancelled || isExiting.current) {

                                    console.log('[Matchmaking] Countdown sırasında iptal edildi. Oda status=abandoned yapılıyor.');

                                    abandonBattle(battleId, user!.odId, true).catch(console.error);

                                    return;

                                }

                                // ğŸ›¡ï¸ FINAL SERVER CHECK before entering

                                try {

                                    const finalSnap = await getDoc(battleRef);

                                    const finalData = finalSnap.data();

                                    if (finalData?.status === 'abandoned') {

                                        console.log('[Matchmaking] Host detected abandonment at FINAL CHECK.');

                                        Alert.alert(

                                            'İptal',

                                            'Rakip eşleşmeyi iptal etti.',

                                            [{

                                                text: 'Tamam',

                                                onPress: () => {

                                                    resetBattle();

                                                    navigation.goBack();

                                                }

                                            }],

                                            { cancelable: false }

                                        );

                                        return;

                                    }

                                } catch (e) { console.error('Final check failed', e); }

                                setBattleState('inProgress');

                            }, 4000);

                        } catch (e) {

                            console.error(e);

                            isFinding = false;

                        }

                    } else {

                        isFinding = false;

                    }

                }, 2000);

            } catch (e) {
                console.error('[Matchmaking] startRealMatchmaking error:', e);
                if (!isCancelled && !isExiting.current) {
                    cancelMatchmaking();
                    Alert.alert('Bağlantı Hatası', 'Eşleşme başlatılırken hata oluştu. Tekrar deneyin.', [
                        { text: 'Tamam', onPress: () => navigation.goBack() }
                    ]);
                }
            }

        };

        startRealMatchmaking();

        return () => {

            if (!isMatchFound) isCancelled = true; // Sadece başarı yoksa iptal say

            if (searchInterval) clearInterval(searchInterval);

            if (unsubscribeMatchmaking) unsubscribeMatchmaking();

            if (user?.odId) leaveMatchmaking(user.odId).catch(() => { });

        };

    }, [battleState, user]);

    // ===============================

    // ğŸ“¡ REAL-TIME BATTLE SYNC

    // ===============================

    useEffect(() => {

        const battleId = useFarmStore.getState().battleId;
        const currentUser = useFarmStore.getState().user;

        if (battleState !== 'inProgress' || !battleId || !currentUser?.odId) return;

        if (battleId.startsWith('local-')) return;

        // Parse hostId correctly: battle_HOSTID_TIMESTAMP

        const parts = battleId.split('_');

        const hostId = parts.slice(1, -1).join('_'); // Skip 'battle_' and last '_TIMESTAMP'

        const isUserHost = currentUser.odId === hostId;

        console.log('[Battle] Sync started. I am host:', isUserHost, 'HostID:', hostId, 'MyID:', currentUser.odId);

        // ğŸ›¡ï¸ LOCAL CONNECTION MONITORING

        // Kullanıcının kendi interneti giderse

        const unsubscribeNet = NetInfo.addEventListener(state => {

            if (state.isConnected === false && battleState === 'inProgress') {

                console.warn('[Battle] âš ï¸ Local connection lost!');

                Alert.alert(

                    'Bağlantı Hatası',

                    'İnternet bağlantınız koptu. Bağlantı stabil olmadığı için ana menüye yönlendiriliyorsunuz.',

                    [],

                    { cancelable: false }

                );

                setTimeout(() => {

                    handleGoBack(); // Ana menüye güvenli dönüş

                }, 250);

            }

        });

        const heartbeat = setInterval(() => updateBattleHeartbeat(battleId, currentUser.odId, isUserHost), 3000);

        // ğŸŸ¢ FORCE CLOSE HANDLING: AppState Listener

        const appStateSubscription = AppState.addEventListener("change", async (nextAppState) => {

            if (battleState === 'inProgress' && nextAppState === "background") {

                console.log("[Battle] âš ï¸ App going background/inactive - Signaling abandon!");

                await abandonBattle(battleId, user.odId, isUserHost);

            }

        });

        // 💀 DEAD MAN'S SWITCH (ROBUST)

        // Checks every 5s if opponent is silent. Works even if Firestore stops sending updates.

        const deadManSwitch = setInterval(() => {
            // 🛡️ Don't trigger if battle is finished or processing
            if (isExiting.current || isFinishedProcessing.current) return;
            if (battleState !== 'inProgress') return;
            if (!battleRef.current) return;

            const battle = battleRef.current;

            // 🛡️ Don't trigger if battle is already finished
            if (battle.status === 'finished' || battle.finishedAt) return;

            const opponentLastActive = isUserHost ? battle.guestLastActiveAt : battle.hostLastActiveAt;

            if (opponentLastActive) {

                const now = Date.now();
                let lastActiveTime: number;
                try {
                    lastActiveTime = opponentLastActive.toMillis ? opponentLastActive.toMillis() : (opponentLastActive.seconds ? opponentLastActive.seconds * 1000 : now);
                } catch {
                    return; // 🛡️ Server timestamp not resolved yet, skip this check
                }

                const timeDiff = now - lastActiveTime;

                if (timeDiff > 25000) { // 25 seconds timeout (increased from 15s)

                    console.warn(`[Battle] 💀 Opponent dead man switch triggered! Silent for ${Math.round(timeDiff / 1000)}s`);

                    // Trigger disconnect handling locally

                    handleDisconnect(battleId, isUserHost ? battle.guestId! : battle.hostId, !isUserHost);

                }

            }

        }, 5000);

        const unsubscribe = listenToBattle(battleId, (battle) => {

            if (isExiting.current) return;

            // Update local ref for Dead Man's Switch

            battleRef.current = battle;

            // Update Opponent Progress via Store Action for UI Refresh

            // If I am Host, opponent is Guest

            const oppScore = isUserHost ? battle.guestScore : battle.hostScore;

            const oppAnsList = isUserHost ? battle.guestAnswers : battle.hostAnswers;
            const oppProgress = oppAnsList ? oppAnsList.length : (isUserHost ? battle.guestProgress : battle.hostProgress);


            // 🛡️ CLIENT-SIDE DEADLOCK PREVENTION (AGGRESSIVE)
            // If both players have finished (Progress >= Total), but status is still 'inProgress'
            // Trigger the Transactional Finish logic immediately.
            const totalQ = battle.questions?.length || 0;
            if (totalQ === 0) return; // 🛡️ No questions = skip deadlock check
            // Handle cross-mapping of progress based on role
            const myProg = isUserHost ? (battle.hostProgress || 0) : (battle.guestProgress || 0);

            if (myProg >= totalQ && oppProgress >= totalQ && battle.status === 'inProgress') {
                console.warn('[Battle] 🛡️ Client detected deadlock (Both 10/10) - Triggering Transactional Finish...');
                // Calling this is safe now because it is Idempotent & Transactional
                finishBattleWithRewards(battle.id)
                    .then(res => console.log('[Battle] Deadlock resolved via Client Trigger:', res))
                    .catch(err => console.error('[Battle] Deadlock resolution failed:', err));
            }

            // console.log('[Battle] Rakip verisi alındı:', { oppScore, oppProgress });

            if (updateRemoteOpponentProgress) {

                updateRemoteOpponentProgress({

                    currentScore: oppScore || 0,

                    currentQuestion: oppProgress || 0,

                    currentCombo: 0

                });

                // console.log('[Battle] updateRemoteOpponentProgress çağrıldı');

            } else {

                console.warn('[Battle] updateRemoteOpponentProgress tanımsız!');

            }

            // 🎭 Emoji kontrolü - Rakipten gelen emoji
            if (battle.lastEmoji && battle.lastEmoji.senderId !== currentUser?.odId) {
                const emojiTs = battle.lastEmoji.timestamp;
                if (emojiTs > lastEmojiTimestamp.current) {
                    lastEmojiTimestamp.current = emojiTs;
                    showEmojiAnimation(battle.lastEmoji.emoji);
                }
            }

            // Game End Conditions

            if (battle.status === 'finished' || battle.status === 'abandoned' || battle.guestDisconnected || battle.hostDisconnected) {

                const myScore = isUserHost ? battle.hostScore : battle.guestScore;

                // Disconnect Handling

                const opponentDisconnected = (isUserHost && battle.guestDisconnected) || (!isUserHost && battle.hostDisconnected);

                const iAmDisconnected = (isUserHost && battle.hostDisconnected) || (!isUserHost && battle.guestDisconnected);

                // If opponent disconnected -> I WIN (but no rewards)

                if (opponentDisconnected) {
                    // 🛡️ Prevent infinite loop
                    if (isExiting.current) return;
                    isExiting.current = true;

                    setFinalBattleData(battle);

                    setFinishReason('Rakip bağlantısı koptu. Kazandın!');

                    setBattleState('finished'); // Show result screen

                    safeEndBattle('win', oppScore || 0, true); // true = isDisconnect (No Trophies)

                    return;

                }

                // If I disconnected (server thinks so) -> Force exit

                if (iAmDisconnected) {
                    // 🛡️ Prevent infinite loop
                    if (isExiting.current) return;
                    isExiting.current = true;

                    setFinalBattleData(battle);

                    setFinishReason('Bağlantınız koptu. Kaybettiniz.');

                    setBattleState('finished');

                    safeEndBattle('loss', oppScore || 0, true);

                    return;

                }

                // If explicit abandonment

                if (battle.status === 'abandoned') {
                    // 🛡️ Prevent infinite loop
                    if (isExiting.current) return;
                    isExiting.current = true;

                    if (battle.abandonedBy === currentUser?.odId) {

                        // I abandoned

                        setFinalBattleData(battle);

                        setFinishReason('Savaşı terk ettin. Kaybettin.');

                        setBattleState('finished');

                        safeEndBattle('loss', oppScore || 0, true); // Count as disconnect/loss

                        return;

                    } else if (battle.abandonedBy) {

                        // Opponent abandoned

                        setFinalBattleData(battle);

                        setFinishReason('Rakip savaşı terk etti. Kazandın!');

                        setBattleState('finished');

                        safeEndBattle('win', oppScore || 0, true);

                        return;

                    }

                }

                // If opponent disconnected without explicit abandon (Dead Man Switch usually also sets abandoned status via server or handleDisconnect)

                if (opponentDisconnected) {

                    setFinalBattleData(battle);

                    setFinishReason('Rakip bağlantısı koptu. Kazandın!');

                    setBattleState('finished'); // Show result screen

                    safeEndBattle('win', oppScore || 0, true); // true = isDisconnect (No Trophies)

                    return;

                }

                // Normal finish
                // 🛡️ RACE CONDITION FIX: Wait for transactions to settle then fetch FRESH data
                // The listener data may be stale due to concurrent transactions changing the winner
                setFinishReason('Savaş Bitti!');

                // Delay to let all concurrent transactions complete
                setTimeout(async () => {
                    if (isExiting.current) return;

                    console.log('[Battle] 🔄 Fetching fresh battle data after settle delay...');

                    // Fetch absolutely latest data from Firebase
                    const freshBattle = await getBattleFresh(battle.id);
                    const finalData = freshBattle || battle; // Fallback to listener data if fetch fails

                    // Calculate scores from answers array for display purposes
                    const calculateScore = (answers: any[] = []) => (answers || []).filter((a: any) => a.isCorrect).length * 100;
                    const finalHostScore = calculateScore(finalData.hostAnswers) || finalData.hostScore || 0;
                    const finalGuestScore = calculateScore(finalData.guestAnswers) || finalData.guestScore || 0;

                    // 🛡️ TRUST SERVER WINNER: Use server's winnerId as PRIMARY source
                    // Only fallback to client calculation if server winnerId is explicitly undefined (not null)
                    let finalWinnerId: string | null = finalData.winnerId ?? null;

                    // If winnerId is explicitly set (even null for draw), use it
                    // only calculate locally if winnerId was never set at all
                    if (finalData.winnerId === undefined) {
                        console.log('[Battle] ⚠️ Server winnerId undefined, using local calculation');
                        if (finalHostScore > finalGuestScore) finalWinnerId = finalData.hostId;
                        else if (finalGuestScore > finalHostScore) finalWinnerId = finalData.guestId;
                        else finalWinnerId = null; // draw
                    }

                    console.log(`[Battle] 📊 FINAL RESULT (Server Priority) - Host: ${finalHostScore}, Guest: ${finalGuestScore}, ServerWinner: ${finalData.winnerId || 'DRAW'}, UsedWinner: ${finalWinnerId || 'DRAW'}`);

                    // Update finalData with calculated scores (for display) but keep server winnerId
                    const authoritativeFinalData = {
                        ...finalData,
                        hostScore: finalHostScore,
                        guestScore: finalGuestScore,
                        winnerId: finalWinnerId
                    };

                    setFinalBattleData(authoritativeFinalData);

                    // Use server winnerId for result determination
                    const freshOppScore = isUserHost ? finalGuestScore : finalHostScore;

                    let result: 'win' | 'loss' | 'draw' = 'draw';
                    if (finalWinnerId) {
                        if (finalWinnerId === currentUser?.odId) result = 'win';
                        else result = 'loss';
                    } else {
                        result = 'draw';
                    }

                    safeEndBattle(result, freshOppScore || 0, false);
                }, 2500); // 2.5 second settle delay - ensures all transactions complete

            }

        }, (error) => {
            // 🛡️ Safe error handler - don't crash the app
            console.error('[Battle] Sync listener error:', error?.message || error);
        });

        return () => {

            clearInterval(heartbeat);

            clearInterval(deadManSwitch);

            appStateSubscription.remove();

            unsubscribe();

            unsubscribeNet();

        };

    }, [battleState, user, updateRemoteOpponentProgress]);

    // Handle Answer

    // Keep track of the last submitted answer for the Watchdog
    const lastAnswerRef = useRef<{ index: number; text: string; time: number } | null>(null);

    // Handle Answer
    const handleAnswer = useCallback(async (index: number) => {

        if (showResult || selectedIndex !== null) return;
        // 🛡️ Guard: currentQuestion must exist
        if (!currentQuestion) return;

        // 🎮 Premium Haptic - Seçim anında
        haptic.rigid();

        setSelectedIndex(index);

        setShowResult(true);

        const isCorrect = currentQuestion?.options[index] === currentQuestion?.correctAnswer;

        const timeMs = Date.now() - questionStartTime.current;

        // 🎮 Premium Haptic + Sound - Doğru/Yanlış tepkisi
        if (isCorrect) {
            // ⚡ Doğru cevap: Güçlü kutlama haptic!
            haptic.heavy();
            setTimeout(() => haptic.success(), 50);
            sound.playSuccess?.();
        } else {
            // 💥 Yanlış cevap: Error haptic!
            haptic.error();
            setTimeout(() => haptic.medium(), 50);
            sound.playWrong?.();
        }

        // 1. Optimistic UI Update (Store)

        submitBattleAnswer(currentQuestionIndex, isCorrect, timeMs);

        // 2. Server-Side Atomic Submission (Background - Optimistic)

        const battleId = useFarmStore.getState().battleId;

        const currentBattleState = useFarmStore.getState().battleState;
        const currentUser = useFarmStore.getState().user;

        if (battleId && currentUser?.odId && !battleId.startsWith('local-') && currentBattleState !== 'finished') {

            // Parse hostId correctly

            const parts = battleId.split('_');

            const hostId = parts.slice(1, -1).join('_');

            const isUserHost = currentUser.odId === hostId;

            // Seçilen cevabın metnini bul

            const selectedText = currentQuestion?.options[index] || '';

            // Cache for Watchdog
            lastAnswerRef.current = {
                index: currentQuestionIndex,
                text: selectedText,
                time: timeMs
            };

            // FIRE-AND-FORGET (Background Execution)

            // UI thread'i bloklamamak için await kullanmıyoruz

            submitAnswer(

                battleId,

                currentUser.odId,

                isUserHost,

                currentQuestionIndex,

                selectedText,

                timeMs

            ).then(result => {

                if (!result.success) {

                    if (result.error === 'BATTLE_NOT_ACTIVE') {

                        // Benign race condition - battle ended while answering

                        console.log('[Battle] ℹ️ Cevap gönderilemedi: Savaş zaten bitti.');

                    } else {

                        console.error('[Battle] ❌ Cevap sunucuda reddedildi:', result.error);

                    }

                } else {

                    console.log(`[Battle] ✅ Cevap onaylandı, Yeni Skor: ${result.newScore}`);

                }

            }).catch(error => {

                console.error('[Battle] 💥 Kritik hata:', error);

            });

        }

        setTimeout(() => {

            if (currentQuestionIndex + 1 >= QUESTION_COUNT) {
                // Savaş bitti - Final sync ve ödül dağıtımı otomatik yapılacak
                // Bekle ve store'daki result verisini kullan
                // Trigger Waiting UI by logically advancing past the last question
                setCurrentQuestionIndex(p => p + 1);
                setShowResult(false);
            } else {

                setCurrentQuestionIndex(p => p + 1);

                setSelectedIndex(null);

                setShowResult(false);

                setTimerKey(p => p + 1);

                questionStartTime.current = Date.now();

            }

        }, 280); // 280ms - optimal feedback visibility

    }, [currentQuestion, currentQuestionIndex, showResult, selectedIndex, battleScore, opponentInfo]);

    // 🛡️ WATCHDOG: Force Sync if stuck at Waiting Screen
    // This fixes the "10/10 but not finishing" bug caused by failed/dropped requests
    useEffect(() => {
        let timeout1: NodeJS.Timeout;
        let timeout2: NodeJS.Timeout;

        if (battleState === 'inProgress' && currentQuestionIndex >= QUESTION_COUNT) {
            console.log('[Battle] Watchdog activated: Waiting for server completion...');

            // 🔄 STAGE 1: Try resubmitting last answer after 2s
            timeout1 = setTimeout(() => {
                console.warn('[Battle] 🚨 Watchdog Stage 1: Force resubmitting last answer...');

                const battleId = useFarmStore.getState().battleId;
                const user = useFarmStore.getState().user;

                if (battleId && user && !battleId.startsWith('local-')) {
                    const parts = battleId.split('_');
                    const hostId = parts.slice(1, -1).join('_');
                    const isUserHost = user.odId === hostId;
                    const lastIndex = QUESTION_COUNT - 1;

                    const cached = lastAnswerRef.current;
                    const answerToResubmit = (cached && cached.index === lastIndex) ? cached.text : '';
                    const timeToResubmit = (cached && cached.index === lastIndex) ? cached.time : 0;

                    submitAnswer(
                        battleId,
                        user.odId,
                        isUserHost,
                        lastIndex,
                        answerToResubmit,
                        timeToResubmit
                    ).then(res => {
                        if (!res.success && res.error === 'BATTLE_NOT_ACTIVE') return;
                        console.log('[Battle] Watchdog Stage 1 result:', res);
                    }).catch(err => {
                        console.error('[Battle] Watchdog Stage 1 failed:', err);
                    });
                }
            }, 2000);

            // 🔄 STAGE 2: Force finishBattleWithRewards after 4s if still stuck
            timeout2 = setTimeout(() => {
                const currentState = useFarmStore.getState().battleState;
                if (currentState !== 'finished') {
                    console.warn('[Battle] 🚨 Watchdog Stage 2: Force calling finishBattleWithRewards...');

                    const battleId = useFarmStore.getState().battleId;
                    if (battleId && !battleId.startsWith('local-')) {
                        finishBattleWithRewards(battleId)
                            .then(res => console.log('[Battle] Watchdog Stage 2 result:', res))
                            .catch(err => console.error('[Battle] Watchdog Stage 2 failed:', err));
                    }
                }
            }, 4000);
        }

        return () => {
            clearTimeout(timeout1);
            clearTimeout(timeout2);
        };
    }, [battleState, currentQuestionIndex]);

    // ===============================

    // ğŸ–¥ï¸ UI RENDERING

    // ===============================

    // 1. MATCHMAKING VIEW

    if (battleState === 'searching' || battleState === 'matched') {

        return (

            <SafeAreaView style={styles.container}>

                <LinearGradient colors={['#1a1b2e', '#2d1b4e']} style={styles.gradient} />

                <View style={styles.matchmakingContainer}>

                    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>

                        <Swords color="#8b5cf6" size={80} />

                    </Animated.View>

                    <Text style={styles.matchmakingTitle}>

                        {battleState === 'matched' ? 'Rakip Bulundu!' : 'Rakip Aranıyor...'}

                    </Text>

                    <Text style={styles.matchmakingSubtitle}>

                        {battleState === 'matched' ? 'Savaş başlıyor...' : 'Benzer seviyede rakip bekleniyor'}

                    </Text>

                    {battleState === 'searching' && <ActivityIndicator size="large" color="#8b5cf6" style={{ marginTop: 20 }} />}

                    <Pressable style={styles.cancelButton} onPress={handleExit}>

                        <Text style={styles.cancelButtonText}>İptal</Text>

                    </Pressable>

                </View>

            </SafeAreaView>

        );

    }

    // 2. WAITING FOR OPPONENT (Finished all questions but battle not finished)

    if (battleState === 'inProgress' && currentQuestionIndex >= QUESTION_COUNT) {

        return (

            <SafeAreaView style={styles.container}>

                <LinearGradient colors={['#1a1b2e', '#16213e']} style={styles.gradient} />

                <View style={styles.waitingOverlay}>

                    <View style={styles.waitingContainer}>

                        <ActivityIndicator size="large" color="#ffffff" style={{ marginBottom: 20 }} />

                        <Text style={styles.waitingTitle}>Müthiş Hız! 🚀</Text>

                        <Text style={styles.waitingSubtitle}>Rakibin bitirmesi bekleniyor...</Text>

                        <View style={styles.opponentStatusContainer}>

                            <Text style={styles.opponentStatusText}>

                                {opponentInfo?.nickname || 'Rakip'} ilerliyor:

                            </Text>

                            <View style={styles.opponentProgressBarContainer}>

                                <View style={[styles.opponentProgressBarFill, {

                                    width: `${((opponentInfo?.currentQuestion || 0) / QUESTION_COUNT) * 100}%`

                                }]} />

                            </View>

                            <Text style={styles.opponentStatusScore}>

                                {(opponentInfo?.currentQuestion || 0)}/{QUESTION_COUNT}

                            </Text>

                        </View>

                        <Pressable style={[styles.cancelButton, { marginTop: 40, backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.5)' }]} onPress={handleExit}>

                            <Text style={[styles.cancelButtonText, { color: '#ef4444' }]}>Çıkış Yap</Text>

                        </Pressable>

                    </View>

                </View>

            </SafeAreaView>

        );

    }

    // 3. BATTLE IN PROGRESS VIEW

    if (battleState === 'inProgress' && currentQuestion) {

        return (

            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

                <LinearGradient colors={['#1a1b2e', '#16213e']} style={styles.gradient} />

                {/* Header */}

                <BattleHeader

                    myScore={finalBattleData && finalBattleData.status === 'finished'
                        ? (user?.odId === finalBattleData.hostId ? (finalBattleData.hostScore || 0) : (finalBattleData.guestScore || 0))
                        : battleScore}

                    opponentScore={opponentInfo?.currentScore || 0}

                    myProgress={currentQuestionIndex + 1}

                    opponentProgress={opponentInfo?.currentQuestion || 0}

                    myNickname={nickname || 'Sen'}

                    opponentNickname={opponentInfo?.nickname || 'Rakip'}

                    onExit={handleExit}

                />

                {/* Content */}

                <View style={[styles.contentContainer, { paddingHorizontal: RS.containerPaddingH }]}>

                    {/* Timer */}

                    <TimerBar

                        duration={TIMER_DURATION}

                        isPaused={showResult}

                        onTimeUp={() => handleAnswer(-1)} // Time up = wrong

                        key={timerKey}

                    />

                    {/* Question */}

                    <ScrollView

                        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}

                        showsVerticalScrollIndicator={false}

                    >

                        <View style={{ paddingVertical: RS.questionPaddingV }}>

                            <Text style={[styles.questionText, { fontSize: RS.questionFont }]}>

                                {currentQuestion.wordText}

                            </Text>

                            <Text style={styles.questionHint}>Kelimesinin anlamı nedir?</Text>

                        </View>

                        {/* Options */}

                        <View style={styles.optionsContainer}>

                            {currentQuestion.options.map((option, index) => (

                                <OptionButton

                                    key={index}

                                    text={option}

                                    index={index}

                                    isSelected={selectedIndex === index}

                                    isCorrect={option === currentQuestion.correctAnswer}

                                    showResult={showResult}

                                    disabled={showResult}

                                    onPress={() => handleAnswer(index)}

                                />

                            ))}

                        </View>

                    </ScrollView>

                </View>

                {/* 🎭 Emoji Picker Button */}
                <Pressable
                    style={[
                        styles.emojiButton,
                        emojiCooldown && styles.emojiButtonDisabled,
                        { backgroundColor: '#8b5cf6' } // More visible purple
                    ]}
                    onPress={() => {
                        console.log('🎭 Emoji button pressed!');
                        if (!emojiCooldown) {
                            haptic.light();
                            setShowEmojiPicker(!showEmojiPicker);
                        }
                    }}
                >
                    <Text style={styles.emojiButtonText}>😊</Text>
                </Pressable>

                {/* 🎭 Emoji Picker Popup */}
                {showEmojiPicker && (
                    <View style={styles.emojiPickerContainer}>
                        <View style={styles.emojiPickerContent}>
                            {BATTLE_EMOJIS.map((emoji, index) => (
                                <Pressable
                                    key={index}
                                    style={styles.emojiPickerItem}
                                    onPress={() => handleSendEmoji(emoji)}
                                >
                                    <Text style={styles.emojiPickerItemText}>{emoji}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                )}

                {/* 🎭 Received Emoji Animation */}
                {receivedEmoji && (
                    <Animated.View
                        style={[
                            styles.receivedEmojiContainer,
                            {
                                opacity: emojiOpacity,
                                transform: [{ scale: emojiScale }],
                            },
                        ]}
                    >
                        <Text style={styles.receivedEmojiText}>{receivedEmoji}</Text>
                    </Animated.View>
                )}

            </SafeAreaView>

        );

    }

    // 3. RESULT VIEW

    // 3. RESULT VIEW

    // 3. BATTLE RESULT SCREEN
    if (battleState === 'finished') {
        // 🛡️ WAIT FOR FINAL DATA: Don't show result screen until data is fully ready
        // This prevents the "update after first display" problem
        if (!finalBattleData) {
            return (
                <SafeAreaView style={styles.container}>
                    <LinearGradient colors={['#1a1b2e', '#16213e']} style={styles.gradient} />
                    <View style={styles.waitingOverlay}>
                        <View style={styles.waitingContainer}>
                            <ActivityIndicator size="large" color="#ffffff" style={{ marginBottom: 20 }} />
                            <Text style={styles.waitingTitle}>Sonuç Hesaplanıyor... ⏳</Text>
                            <Text style={styles.waitingSubtitle}>Lütfen bekleyin</Text>
                        </View>
                    </View>
                </SafeAreaView>
            );
        }

        // 🛡️ Calculate opponent score from finalBattleData (not from potentially stale opponentInfo)
        const isUserHost = user?.odId === finalBattleData.hostId;
        const opponentScore = isUserHost ? (finalBattleData.guestScore || 0) : (finalBattleData.hostScore || 0);

        // 🛡️ AUTHORITATIVE RESULT: Use finalBattleData (already calculated with authoritative scores)
        let resultType: 'win' | 'loss' | 'draw' = 'draw';
        if (finalBattleData.winnerId === user?.odId) resultType = 'win';
        else if (finalBattleData.winnerId === null) resultType = 'draw';
        else resultType = 'loss';

        // 🏆 Calculate correct answers from final data
        const myAnswers = user?.odId === finalBattleData.hostId
            ? finalBattleData.hostAnswers
            : finalBattleData.guestAnswers;
        const correctCount = myAnswers ? myAnswers.filter((a: any) => a.isCorrect).length : Math.round(battleScore / 100);

        const stats = {
            accuracy: Math.round((correctCount / QUESTION_COUNT) * 100) || 0,
            speed: 85,
            streak: 0
        };

        // 💰 REWARD SYSTEM: 100 coin + 100 XP PER CORRECT ANSWER
        const rewards = {
            xp: correctCount * 100,
            coin: correctCount * 100
        };


        const handlePlayAgain = () => {
            haptic.medium();
            resetBattle();
            navigation.goBack();
        };

        const handleGoHome = () => {
            haptic.medium();
            resetBattle();
            navigation.goBack();
        };

        return (
            <BattleResultScreen
                result={resultType}
                myScore={finalBattleData && finalBattleData.status === 'finished'
                    ? (user?.odId === finalBattleData.hostId ? (finalBattleData.hostScore || 0) : (finalBattleData.guestScore || 0))
                    : battleScore}
                opponentScore={opponentScore || 0}
                myInfo={{
                    ...user,
                    isDisconnected: finishReason?.includes('Bağlantınız') || finalBattleData?.hostDisconnected && user?.odId === finalBattleData?.hostId || finalBattleData?.guestDisconnected && user?.odId === finalBattleData?.guestId,
                    isAbandoned: false // Typically user knows if they clicked quit, but for symmetry
                }}
                opponentInfo={{
                    ...opponentInfo,
                    // Check strict 'disconnected' flags first
                    isDisconnected: finalBattleData?.hostDisconnected && opponentInfo?.odId === finalBattleData?.hostId || finalBattleData?.guestDisconnected && opponentInfo?.odId === finalBattleData?.guestId,
                    // Check 'abandonedBy' for voluntary quit
                    isAbandoned: finishReason?.includes('Rakip') || finalBattleData?.abandonedBy === opponentInfo?.odId
                }}
                rewards={rewards}
                stats={stats}
                questions={finalBattleData?.questions || []}
                myAnswers={myAnswers || []}
                onPlayAgain={handlePlayAgain}
                onHome={handleGoHome}
            />
        );
    }

    return <View style={styles.container} />;

};

const styles = StyleSheet.create({

    container: {

        flex: 1,

        backgroundColor: '#1a1b2e',

    },

    gradient: {

        ...StyleSheet.absoluteFillObject,

    },

    // Header Styles

    battleHeader: {

        flexDirection: 'row',

        alignItems: 'center',

        justifyContent: 'space-between',

        paddingVertical: 12,

        backgroundColor: 'rgba(0,0,0,0.2)',

        borderBottomWidth: 1,

        borderBottomColor: 'rgba(255,255,255,0.05)',

    },

    playerSection: {

        flex: 1,

        alignItems: 'flex-start',

    },

    opponentSection: {

        alignItems: 'flex-end',

    },

    playerInfo: {

        marginBottom: 4,

    },

    playerName: {

        color: '#94a3b8',

        fontWeight: '600',

    },

    opponentName: {

        textAlign: 'right',

        color: '#94a3b8',

    },

    playerScore: {

        color: '#fff',

        fontWeight: 'bold',

    },

    opponentScore: {

        textAlign: 'right',

        color: '#fff',

    },

    progressBarContainer: {

        width: '100%',

        height: 6,

        backgroundColor: 'rgba(255,255,255,0.1)',

        borderRadius: 3,

        overflow: 'hidden',

        marginBottom: 2,

    },

    progressBar: {

        height: '100%',

        borderRadius: 3,

    },

    myProgressBar: {

        backgroundColor: '#22c55e',

    },

    opponentProgressBar: {

        backgroundColor: '#ef4444',

    },

    progressText: {

        color: 'rgba(255,255,255,0.5)',

        fontSize: 10,

    },

    vsContainer: {

        alignItems: 'center',

        justifyContent: 'center',

        width: 60,

    },

    vsText: {

        fontWeight: 'bold',

        marginTop: 4,

    },

    // Matchmaking

    matchmakingContainer: {

        flex: 1,

        alignItems: 'center',

        justifyContent: 'center',

        padding: 20,

    },

    matchmakingTitle: {

        fontSize: 24,

        fontWeight: 'bold',

        color: '#fff',

        marginTop: 30,

        marginBottom: 10,

    },

    matchmakingSubtitle: {

        fontSize: 16,

        color: '#94a3b8',

        marginBottom: 30,

    },

    cancelButton: {

        paddingVertical: 12,

        paddingHorizontal: 30,

        backgroundColor: 'rgba(255, 69, 58, 0.2)',

        borderRadius: 20,

        borderWidth: 1,

        borderColor: 'rgba(255, 69, 58, 0.5)',

    },

    cancelButtonText: {

        color: '#ff453a',

        fontWeight: '600',

    },

    // Battle Content

    contentContainer: {

        flex: 1,

        width: '100%',

        maxWidth: 800, // Tablet max width

        alignSelf: 'center',

    },

    timerBarContainer: {

        width: '100%',

        backgroundColor: 'rgba(255,255,255,0.1)',

        borderRadius: 4,

        marginBottom: 10,

        overflow: 'hidden',

    },

    timerBarFill: {

        height: '100%',

        borderRadius: 4,

    },

    questionText: {

        color: '#fff',

        fontWeight: 'bold',

        textAlign: 'center',

        marginBottom: 8,

    },

    questionHint: {

        color: '#94a3b8',

        fontSize: 14,

        textAlign: 'center',

        marginBottom: 20,

    },

    optionsContainer: {

        width: '100%',

    },

    optionButton: {

        flexDirection: 'row',

        alignItems: 'center',

        justifyContent: 'center',

        borderRadius: 16,

        borderWidth: 1.5,

        width: '100%',

        position: 'relative',

    },

    optionText: {

        color: '#fff',

        fontWeight: '600',

        textAlign: 'center',

    },

    resultIcon: {

        position: 'absolute',

        right: 16,

        borderRadius: 100,

        alignItems: 'center',

        justifyContent: 'center',

    },

    // Result

    resultContainer: {

        flex: 1,

        alignItems: 'center',

        justifyContent: 'center',

    },

    exitButton: {

        padding: 16,

        backgroundColor: '#ef4444',

        borderRadius: 12,

    },

    exitButtonHeader: {

        padding: 4,

        backgroundColor: 'rgba(239, 68, 68, 0.1)',

        borderRadius: 8,

        marginRight: 4,

    },

    exitButtonText: {

        color: '#fff',

        fontWeight: 'bold',

    },

    // Waiting Screen Overlay

    waitingOverlay: {

        position: 'absolute',

        top: 0,

        left: 0,

        right: 0,

        bottom: 0,

        backgroundColor: 'rgba(0,0,0,0.85)',

        zIndex: 50,

        justifyContent: 'center',

        alignItems: 'center',

    },

    waitingContainer: {

        padding: 30,

        alignItems: 'center',

        width: '80%',

        maxWidth: 400,

    },

    waitingTitle: {

        fontSize: 28,

        fontWeight: 'bold',

        color: '#fff',

        marginBottom: 10,

        textAlign: 'center',

    },

    waitingSubtitle: {

        fontSize: 16,

        color: 'rgba(255,255,255,0.7)',

        textAlign: 'center',

        marginBottom: 40,

    },

    opponentStatusContainer: {

        width: '100%',

        backgroundColor: 'rgba(255,255,255,0.1)',

        padding: 20,

        borderRadius: 16,

        borderWidth: 1,

        borderColor: 'rgba(255,255,255,0.1)',

    },

    opponentStatusText: {

        fontSize: 14,

        color: 'rgba(255,255,255,0.9)',

        marginBottom: 10,

    },

    opponentProgressBarContainer: {

        height: 8,

        backgroundColor: 'rgba(255,255,255,0.1)',

        borderRadius: 4,

        width: '100%',

        overflow: 'hidden',

        marginBottom: 8,

    },

    opponentProgressBarFill: {

        height: '100%',

        backgroundColor: '#ef4444',

        borderRadius: 4,

    },

    opponentStatusScore: {

        fontSize: 12,

        color: 'rgba(255,255,255,0.5)',

        textAlign: 'right',

    },

    // Result Screen Styles

    resultContent: {

        flex: 1,

        alignItems: 'center',

        justifyContent: 'center',

        padding: 20,

    },

    resultEmoji: {

        fontSize: 80,

        marginBottom: 20,

    },

    resultTitle: {

        fontSize: RS.resultTitle,

        fontWeight: 'bold',

        color: 'white',

        marginBottom: 10,

        textAlign: 'center',

    },

    resultMessage: {

        fontSize: RS.optionFont,

        color: 'rgba(255, 255, 255, 0.9)',

        textAlign: 'center',

        marginBottom: 40,

        paddingHorizontal: 20,

    },

    scoresRow: {

        flexDirection: 'row',

        alignItems: 'center',

        justifyContent: 'center',

        marginBottom: 40,

        width: '100%',

    },

    scoreCard: {

        backgroundColor: 'rgba(255, 255, 255, 0.2)',

        borderRadius: 16,

        padding: 20,

        alignItems: 'center',

        minWidth: 120,

    },

    opponentScoreCard: {

        backgroundColor: 'rgba(255, 255, 255, 0.15)',

    },

    scoreLabel: {

        fontSize: RS.labelFont,

        color: 'rgba(255, 255, 255, 0.8)',

        marginBottom: 8,

    },

    scoreValue: {

        fontSize: RS.statNumber,

        fontWeight: 'bold',

        color: 'white',

    },

    resultVsText: {

        fontSize: RS.optionFont * 1.5,

        fontWeight: 'bold',

        color: 'white',

        marginHorizontal: 20,

    },

    statsBox: {

        backgroundColor: 'rgba(255, 255, 255, 0.15)',

        borderRadius: 16,

        padding: 20,

        width: '100%',

        marginBottom: 40,

    },

    statsTitle: {

        fontSize: RS.optionFont,

        fontWeight: 'bold',

        color: 'white',

        marginBottom: 16,

        textAlign: 'center',

    },

    statsGrid: {

        flexDirection: 'row',

        justifyContent: 'space-around',

    },

    statItem: {

        alignItems: 'center',

    },

    statValue: {

        fontSize: RS.statNumber * 0.8,

        fontWeight: 'bold',

        color: 'white',

        marginBottom: 4,

    },

    statLabel: {

        fontSize: RS.statLabel,

        color: 'rgba(255, 255, 255, 0.8)',

    },

    resultButtons: {

        width: '100%',

        gap: 12,

    },

    primaryResultButton: {

        width: '100%',

        padding: 16,

        borderRadius: 12,

        backgroundColor: 'white',

        alignItems: 'center',

    },

    primaryResultButtonText: {

        fontSize: RS.optionFont + 2,

        fontWeight: 'bold',

        color: '#1a1b2e',

    },

    secondaryResultButton: {

        width: '100%',

        padding: 16,

        borderRadius: 12,

        backgroundColor: 'transparent',

        borderWidth: 2,

        borderColor: 'white',

        alignItems: 'center',

    },

    secondaryResultButtonText: {

        fontSize: RS.optionFont + 2,

        fontWeight: 'bold',

        color: 'white',

    },

    // Details Report

    detailsBox: {

        backgroundColor: 'rgba(255, 255, 255, 0.15)',

        borderRadius: 16,

        padding: RS.containerPaddingH,

        width: '100%',

        marginBottom: 20,

    },

    tableHeader: {

        flexDirection: 'row',

        paddingBottom: 10,

        borderBottomWidth: 1,

        borderBottomColor: 'rgba(255,255,255,0.1)',

        marginBottom: 10,

    },

    tableHeaderText: {

        flex: 1,

        color: 'rgba(255,255,255,0.6)',

        fontSize: RS.labelFont,

        fontWeight: 'bold',

        textAlign: 'center',

    },

    tableRow: {

        flexDirection: 'row',

        paddingVertical: 8,

        borderBottomWidth: 1,

        borderBottomColor: 'rgba(255,255,255,0.05)',

        alignItems: 'center',

    },

    tableCellText: {

        color: 'white',

        fontSize: RS.optionFont,

        fontWeight: '500',

    },

    tableCellIcon: {

        flex: 1,

        alignItems: 'center',

        justifyContent: 'center',

    },

    dashText: {

        color: 'rgba(255,255,255,0.3)',

    },

    // 🎭 Emoji Picker Styles
    emojiButton: {
        position: 'absolute',
        top: 140,
        left: 16,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(139, 92, 246, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(139, 92, 246, 0.5)',
        zIndex: 5,
    },
    emojiButtonDisabled: {
        opacity: 0.4,
    },
    emojiButtonText: {
        fontSize: 28,
    },
    emojiPickerContainer: {
        position: 'absolute',
        top: 190,
        left: 16,
        zIndex: 10,
    },
    emojiPickerContent: {
        flexDirection: 'row',
        backgroundColor: 'rgba(30, 30, 50, 0.95)',
        borderRadius: 16,
        padding: 8,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.4)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    emojiPickerItem: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
    },
    emojiPickerItemText: {
        fontSize: 28,
    },
    receivedEmojiContainer: {
        position: 'absolute',
        top: '15%',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 1,
        pointerEvents: 'none',
    },
    receivedEmojiText: {
        fontSize: 56,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
    },

});

export default BattleScreen;

