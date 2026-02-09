/**
 * BattleMenuScreen - Battle Mode Entry Point
 * FarmEnglish Battle Mode
 * 
 * Özellikler:
 * - Hızlı Eşleşme (otomatik matchmaking)
 * - Arkadaşla Savaş (oda kodu ile)
 * - Liderlik Tablosu
 */

import React, { useState, useCallback, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ScrollView,
    TextInput,
    Modal,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Swords, Trophy, Users, Flame, ChevronRight, Lock, Star, Crown, Copy, X } from 'lucide-react-native';
import { useFarmStore } from '../store/farmStore';
import { haptic } from '../utils/sound';
import { createBattleRoom, joinBattleRoom, generateBattleQuestions, listenToBattle, startBattle } from '../utils/firebaseBattle';
import * as Clipboard from 'expo-clipboard';

// Base responsive sizes helper
const getResponsiveSizes = (width: number, height: number) => {
    const isSmall = height < 700;
    const isVerySmall = height < 620;
    const isTablet = Math.min(width, height) >= 600;
    const isLandscape = width > height;

    return {
        headerHeight: isVerySmall ? 60 : 70,
        titleSize: isTablet ? 32 : isVerySmall ? 20 : 24,
        cardTitleSize: isTablet ? 22 : 18,
        cardDescSize: isTablet ? 15 : 13,
        statValueSize: isTablet ? 24 : 18,
        statLabelSize: isTablet ? 14 : 12,
        iconSize: isTablet ? 32 : 24,
        containerPadding: isTablet ? 24 : 16,
        cardPadding: isTablet ? 24 : 16,
        isTablet,
        isLandscape,
        contentWidth: isTablet || isLandscape ? Math.min(width - 48, 600) : '100%',
    };
};

interface BattleMenuScreenProps {
    navigation: any;
}

// Stats Card Component
const StatsCard = memo(({ icon, label, value, color, RS }: { icon: React.ReactNode; label: string; value: string | number; color: string; RS: any }) => (
    <View style={[styles.statsCard, { padding: RS.cardPadding }]}>
        {icon}
        <Text style={[styles.statsValue, { fontSize: RS.statValueSize }]}>{value}</Text>
        <Text style={[styles.statsLabel, { fontSize: RS.statLabelSize }]}>{label}</Text>
    </View>
));

// Mode Card Component
const ModeCard = memo(({
    title,
    description,
    icon,
    gradient,
    onPress,
    locked,
    lockReason,
    RS,
}: {
    title: string;
    description: string;
    icon: React.ReactNode;
    gradient: readonly [string, string, ...string[]];
    onPress: () => void;
    locked?: boolean;
    lockReason?: string;
    RS: any;
}) => (
    <Pressable
        style={[styles.modeCard, locked && styles.modeCardLocked]}
        onPress={() => {
            if (!locked) {
                haptic.medium();
                onPress();
            } else {
                haptic.error();
            }
        }}
    >
        <LinearGradient
            colors={locked ? ['#1a1a2e', '#16213e'] : gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.modeCardGradient, { padding: RS.cardPadding }]}
        >
            <View style={styles.modeCardContent}>
                <View style={styles.modeIconContainer}>
                    {icon}
                    {locked && (
                        <View style={styles.lockBadge}>
                            <Lock color="#fff" size={12} />
                        </View>
                    )}
                </View>
                <View style={styles.modeTextContainer}>
                    <Text style={[styles.modeTitle, locked && styles.modeTitleLocked, { fontSize: RS.cardTitleSize }]}>{title}</Text>
                    <Text style={[styles.modeDescription, locked && styles.modeDescLocked, { fontSize: RS.cardDescSize }]}>
                        {locked ? lockReason : description}
                    </Text>
                </View>
                {!locked && <ChevronRight color="rgba(255,255,255,0.5)" size={24} />}
            </View>
        </LinearGradient>
    </Pressable>
));

// Oda Kodu Modalı
const RoomCodeModal = memo(({
    visible,
    roomCode,
    onClose,
    onStartBattle,
    waiting,
}: {
    visible: boolean;
    roomCode: string;
    onClose: () => void;
    onStartBattle: () => void;
    waiting: boolean;
}) => {
    const copyCode = async () => {
        await Clipboard.setStringAsync(roomCode);
        haptic.success();
        Alert.alert('Kopyalandı!', 'Oda kodu panoya kopyalandı');
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Pressable style={styles.modalCloseBtn} onPress={onClose}>
                        <X color="#fff" size={24} />
                    </Pressable>

                    <Swords color="#8b5cf6" size={48} />
                    <Text style={styles.modalTitle}>Oda Oluşturuldu!</Text>
                    <Text style={styles.modalSubtitle}>
                        Bu kodu arkadaşınla paylaş
                    </Text>

                    <View style={styles.codeContainer}>
                        <Text style={styles.codeText}>{roomCode}</Text>
                        <Pressable style={styles.copyBtn} onPress={copyCode}>
                            <Copy color="#8b5cf6" size={20} />
                        </Pressable>
                    </View>

                    {waiting ? (
                        <View style={styles.waitingContainer}>
                            <ActivityIndicator color="#8b5cf6" />
                            <Text style={styles.waitingText}>Arkadaş bekleniyor...</Text>
                        </View>
                    ) : (
                        <Pressable style={styles.startButton} onPress={onStartBattle}>
                            <Text style={styles.startButtonText}>Savaşı Başlat</Text>
                        </Pressable>
                    )}
                </View>
            </View>
        </Modal>
    );
});

// Odaya Katıl Modalı
const JoinRoomModal = memo(({
    visible,
    onClose,
    onJoin,
    loading,
}: {
    visible: boolean;
    onClose: () => void;
    onJoin: (code: string) => void;
    loading: boolean;
}) => {
    const [code, setCode] = useState('');

    return (
        <Modal visible={visible} transparent animationType="fade">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <ScrollView
                    contentContainerStyle={styles.modalScrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.modalContent}>
                        <Pressable style={styles.modalCloseBtn} onPress={onClose}>
                            <X color="#fff" size={24} />
                        </Pressable>

                        <Users color="#22c55e" size={48} />
                        <Text style={styles.modalTitle}>Odaya Katıl</Text>
                        <Text style={styles.modalSubtitle}>
                            Arkadaşının paylaştığı kodu gir
                        </Text>

                        <TextInput
                            style={styles.codeInput}
                            placeholder="ABCD12"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            value={code}
                            onChangeText={(text) => setCode(text.toUpperCase())}
                            maxLength={6}
                            autoCapitalize="characters"
                            autoCorrect={false}
                        />

                        <Pressable
                            style={[styles.joinButton, code.length < 6 && styles.joinButtonDisabled]}
                            onPress={() => onJoin(code)}
                            disabled={loading || code.length < 6}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.joinButtonText}>Katıl</Text>
                            )}
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
});

export const BattleMenuScreen: React.FC<BattleMenuScreenProps> = ({ navigation }) => {
    // Dynamic dimensions
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const RS = getResponsiveSizes(windowWidth, windowHeight);

    // Store state
    const isAuthenticated = useFarmStore((s) => s.isAuthenticated);
    const battleWins = useFarmStore((s) => s.battleWins);
    const battleLosses = useFarmStore((s) => s.battleLosses);
    const bestBattleStreak = useFarmStore((s) => s.bestBattleStreak);
    const currentBattleStreak = useFarmStore((s) => s.currentBattleStreak);
    const dailyStreak = useFarmStore((s) => s.dailyStreak);
    const level = useFarmStore((s) => s.level);
    const user = useFarmStore((s) => s.user);
    const nickname = useFarmStore((s) => s.nickname);
    const farm = useFarmStore((s) => s.farm);
    const pool = useFarmStore((s) => s.pool);

    // Modal states
    const [showCreateRoom, setShowCreateRoom] = useState(false);
    const [showJoinRoom, setShowJoinRoom] = useState(false);
    const [roomCode, setRoomCode] = useState('');
    const [battleId, setBattleId] = useState('');
    const [waiting, setWaiting] = useState(false);
    const [joining, setJoining] = useState(false);

    // Calculate win rate
    const totalBattles = battleWins + battleLosses;
    const winRate = totalBattles > 0 ? Math.round((battleWins / totalBattles) * 100) : 0;

    // Generate battle nickname - use profile nickname, or generate unique if default
    const getBattleNickname = useCallback(() => {
        const profileNickname = nickname || user?.nickname || 'Oyuncu';
        if (profileNickname === 'Oyuncu') {
            // Generate unique nickname like "Oyuncu_a3b7"
            const suffix = Math.random().toString(36).substring(2, 6);
            return `Oyuncu_${suffix}`;
        }
        return profileNickname;
    }, [nickname, user]);

    // Handlers
    const handleQuickMatch = useCallback(() => {
        // Auto-generate user if not authenticated
        if (!user) {
            // Create a unique odId for this session
            const tempOdId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
            useFarmStore.getState().setUser({
                odId: tempOdId,
                nickname: getBattleNickname(),
            });
            useFarmStore.getState().setIsAuthenticated(true);
        }
        navigation.navigate('Battle', { mode: 'quickMatch' });
    }, [navigation, user, getBattleNickname]);

    const handleCreateRoom = useCallback(async () => {
        // Auto-generate user if not authenticated
        let currentUser = user;
        if (!currentUser) {
            const tempOdId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
            const tempNickname = getBattleNickname();
            useFarmStore.getState().setUser({
                odId: tempOdId,
                nickname: tempNickname,
            });
            useFarmStore.getState().setIsAuthenticated(true);
            currentUser = { odId: tempOdId, nickname: tempNickname };
        }

        haptic.medium();

        try {
            // Gerçek kelime havuzundan soru oluştur
            const allWords = [...farm, ...pool];
            const questions = generateBattleQuestions(allWords, 10);
            const result = await createBattleRoom(currentUser.odId, nickname || currentUser.nickname, questions);
            setRoomCode(result.roomCode);
            setBattleId(result.battleId);
            setShowCreateRoom(true);
            setWaiting(true);

            // Listen for guest joining the room
            const unsubscribe = listenToBattle(
                result.battleId,
                async (battle) => {
                    if (battle.status === 'ready' && battle.guestId) {
                        // Guest joined, start the battle
                        setWaiting(false);
                        await startBattle(result.battleId);

                        // Set battle data to store BEFORE navigating (so BattleScreen has questions)
                        useFarmStore.getState().setBattleData({
                            battleId: result.battleId,
                            questions: questions,
                            opponentInfo: {
                                odId: battle.guestId,
                                nickname: battle.guestNickname || 'Rakip',
                                level: useFarmStore.getState().level,
                            },
                        });
                        useFarmStore.getState().setBattleState('inProgress');

                        setShowCreateRoom(false);
                        unsubscribe();
                        navigation.navigate('Battle', { mode: 'friendBattle', battleId: result.battleId });
                    }
                },
                (error) => {
                    console.error('Room listen error:', error);
                }
            );
        } catch (error) {
            Alert.alert('Hata', 'Oda oluşturulamadı');
        }
    }, [isAuthenticated, user, nickname, navigation, farm, pool]);

    const handleJoinRoom = useCallback(async (code: string) => {
        // Auto-generate user if not authenticated
        let currentUser = user;
        if (!currentUser) {
            const tempOdId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
            const tempNickname = getBattleNickname();
            useFarmStore.getState().setUser({
                odId: tempOdId,
                nickname: tempNickname,
            });
            useFarmStore.getState().setIsAuthenticated(true);
            currentUser = { odId: tempOdId, nickname: tempNickname };
        }

        setJoining(true);

        try {
            const result = await joinBattleRoom(code, currentUser.odId, nickname || currentUser.nickname);

            if (result.success && result.battleId && result.battleData) {
                // Set battle data to store BEFORE navigating (so BattleScreen has questions)
                useFarmStore.getState().setBattleData({
                    battleId: result.battleId,
                    questions: result.battleData.questions || [],
                    opponentInfo: {
                        odId: result.battleData.hostId,
                        nickname: result.battleData.hostNickname || 'Rakip',
                        level: level,
                    },
                });
                useFarmStore.getState().setBattleState('matched');

                setShowJoinRoom(false);
                navigation.navigate('Battle', { mode: 'friendBattle', battleId: result.battleId });
            } else {
                Alert.alert('Hata', result.error || 'Odaya katılınamadı');
            }
        } catch (error) {
            Alert.alert('Hata', 'Bir şeyler yanlış gitti');
        } finally {
            setJoining(false);
        }
    }, [isAuthenticated, user, nickname, navigation, level]);

    const handleStartBattle = useCallback(() => {
        if (battleId) {
            setShowCreateRoom(false);
            navigation.navigate('Battle', { mode: 'friendBattle', battleId });
        }
    }, [battleId, navigation]);

    const handleLeaderboard = useCallback(() => {
        navigation.navigate('Leaderboard');
    }, [navigation]);

    const handleBack = useCallback(() => {
        haptic.light();
        // Stack'te geri gidilecek ekran yoksa Quiz'e git
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.reset({
                index: 0,
                routes: [{ name: 'Quiz' }],
            });
        }
    }, [navigation]);

    // Tablet centering wrapper style
    const contentStyle: any = {
        width: typeof RS.contentWidth === 'number' ? RS.contentWidth : '100%',
        alignSelf: 'center',
    };

    return (
        <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
            <SafeAreaView style={styles.container}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={[styles.header, { paddingHorizontal: RS.containerPadding }]}>
                        <Pressable style={styles.backButton} onPress={handleBack}>
                            <ChevronRight color="#fff" size={24} style={{ transform: [{ rotate: '180deg' }] }} />
                        </Pressable>
                        <View style={styles.headerTitleContainer}>
                            <Swords color="#8b5cf6" size={RS.iconSize} />
                            <Text style={[styles.headerTitle, { fontSize: RS.titleSize }]}>Savaş Modu</Text>
                        </View>
                        <View style={styles.headerSpacer} />
                    </View>

                    {/* Content Wrapper for Tablet Centering */}
                    <View style={[styles.contentWrapper, { paddingHorizontal: RS.containerPadding }]}>
                        <View style={contentStyle}>
                            {/* Auth Warning */}
                            {!isAuthenticated && (
                                <Pressable
                                    style={styles.authWarning}
                                    onPress={() => navigation.navigate('Auth')}
                                >
                                    <Lock color="#f59e0b" size={18} />
                                    <Text style={styles.authWarningText}>
                                        Savaş modunu kullanmak için kayıt ol
                                    </Text>
                                    <ChevronRight color="#f59e0b" size={18} />
                                </Pressable>
                            )}

                            {/* 🏆 Leaderboard Link - Prominent Position */}
                            <Pressable style={styles.leaderboardLinkTop} onPress={handleLeaderboard}>
                                <Trophy color="#f59e0b" size={22} />
                                <Text style={styles.leaderboardTextTop}>Liderlik Tablosunu Gör</Text>
                                <ChevronRight color="#f59e0b" size={20} />
                            </Pressable>

                            {/* 🔥 Daily Streak Banner */}
                            {dailyStreak > 0 && (
                                <View style={styles.dailyStreakBanner}>
                                    <Flame color="#ff6b35" size={22} fill="#ff6b35" />
                                    <Text style={styles.dailyStreakText}>
                                        {dailyStreak} Günlük Seri!
                                    </Text>
                                    <Text style={styles.dailyStreakSubtext}>
                                        🔥 Yarın da gel!
                                    </Text>
                                </View>
                            )}

                            {/* Stats Row */}
                            <View style={[styles.statsRow, { gap: RS.containerPadding }]}>
                                <StatsCard
                                    icon={<Trophy color="#22c55e" size={RS.iconSize} />}
                                    label="Galibiyet"
                                    value={battleWins}
                                    color="#22c55e"
                                    RS={RS}
                                />
                                <StatsCard
                                    icon={<Flame color="#f59e0b" size={RS.iconSize} />}
                                    label="En İyi Seri"
                                    value={bestBattleStreak}
                                    color="#f59e0b"
                                    RS={RS}
                                />
                                <StatsCard
                                    icon={<Star color="#8b5cf6" size={RS.iconSize} />}
                                    label="Kazanma %"
                                    value={`${winRate}%`}
                                    color="#8b5cf6"
                                    RS={RS}
                                />
                            </View>

                            {/* Current Streak Banner */}
                            {currentBattleStreak > 0 && (
                                <View style={styles.streakBanner}>
                                    <Flame color="#f59e0b" size={24} fill="#f59e0b" />
                                    <Text style={styles.streakText}>
                                        {currentBattleStreak} Maç Kazanma Serisi!
                                    </Text>
                                </View>
                            )}

                            {/* Mode Cards */}
                            <View style={[styles.modesContainer, { gap: RS.containerPadding }]}>
                                <Text style={[styles.sectionTitle, { fontSize: RS.cardTitleSize }]}>Oyun Modları</Text>

                                <ModeCard
                                    title="Hızlı Eşleşme"
                                    description="Rastgele bir rakiple anında savaş"
                                    icon={<Swords color="#fff" size={RS.iconSize * 1.5} />}
                                    gradient={['#8b5cf6', '#6d28d9']}
                                    onPress={handleQuickMatch}
                                    locked={!isAuthenticated}
                                    lockReason="Kayıt olarak erişin"
                                    RS={RS}
                                />

                                <ModeCard
                                    title="Oda Oluştur"
                                    description="Arkadaşını davet etmek için oda oluştur"
                                    icon={<Crown color="#fff" size={RS.iconSize * 1.5} />}
                                    gradient={['#f59e0b', '#d97706']}
                                    onPress={handleCreateRoom}
                                    locked={!isAuthenticated}
                                    lockReason="Kayıt olarak erişin"
                                    RS={RS}
                                />

                                <ModeCard
                                    title="Odaya Katıl"
                                    description="Arkadaşının odasına katıl"
                                    icon={<Users color="#fff" size={RS.iconSize * 1.5} />}
                                    gradient={['#22c55e', '#16a34a']}
                                    onPress={() => {
                                        if (!isAuthenticated) {
                                            navigation.navigate('Auth');
                                            return;
                                        }
                                        haptic.medium();
                                        setShowJoinRoom(true);
                                    }}
                                    locked={!isAuthenticated}
                                    lockReason="Kayıt olarak erişin"
                                    RS={RS}
                                />
                            </View>

                        </View>
                    </View>
                </ScrollView>

                {/* Modals */}
                <RoomCodeModal
                    visible={showCreateRoom}
                    roomCode={roomCode}
                    onClose={() => setShowCreateRoom(false)}
                    onStartBattle={handleStartBattle}
                    waiting={waiting}
                />

                <JoinRoomModal
                    visible={showJoinRoom}
                    onClose={() => setShowJoinRoom(false)}
                    onJoin={handleJoinRoom}
                    loading={joining}
                />
            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 32,
    },
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#ffffff',
    },
    headerSpacer: {
        width: 40,
    },
    // Content Wrapper for Tablet
    contentWrapper: {
        flex: 1,
        width: '100%',
    },
    // Auth Warning
    authWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    authWarningText: {
        flex: 1,
        color: '#f59e0b',
        fontSize: 14,
        fontWeight: '600',
    },
    // Stats
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 32,
        gap: 12,
    },
    statsCard: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    statsValue: {
        fontSize: 20,
        fontWeight: '900',
        color: '#ffffff',
        marginVertical: 4,
    },
    statsLabel: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.6)',
        fontWeight: '500',
    },
    // Streak Banner
    streakBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 32,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.2)',
    },
    streakText: {
        color: '#f59e0b',
        fontSize: 16,
        fontWeight: '800',
    },
    // Modes
    modesContainer: {
        gap: 16,
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#ffffff',
        marginBottom: 16,
    },
    modeCard: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        backgroundColor: '#1a1a2e',
    },
    modeCardLocked: {
        opacity: 0.7,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    modeCardGradient: {
        padding: 24,
    },
    modeCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    modeIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    lockBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#dc2626',
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#1a1a2e',
    },
    modeTextContainer: {
        flex: 1,
    },
    modeTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#ffffff',
        marginBottom: 4,
    },
    modeTitleLocked: {
        color: 'rgba(255, 255, 255, 0.6)',
    },
    modeDescription: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.6)',
    },
    modeDescLocked: {
        color: 'rgba(255, 255, 255, 0.4)',
    },
    // Leaderboard Link
    leaderboardLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        paddingVertical: 16,
        borderRadius: 16,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.2)',
    },
    leaderboardText: {
        color: '#f59e0b',
        fontSize: 16,
        fontWeight: '700',
    },
    // Leaderboard Link - Top Position (More Prominent)
    leaderboardLinkTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 16,
        gap: 10,
        borderWidth: 1.5,
        borderColor: 'rgba(245, 158, 11, 0.4)',
        marginBottom: 20,
    },
    leaderboardTextTop: {
        color: '#f59e0b',
        fontSize: 16,
        fontWeight: '800',
        flex: 1,
    },
    // 🔥 Daily Streak Banner
    dailyStreakBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 107, 53, 0.15)',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 14,
        gap: 8,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 107, 53, 0.4)',
        marginBottom: 16,
    },
    dailyStreakText: {
        color: '#ff6b35',
        fontSize: 18,
        fontWeight: '900',
    },
    dailyStreakSubtext: {
        color: 'rgba(255, 107, 53, 0.8)',
        fontSize: 12,
        fontWeight: '600',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalScrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    modalContent: {
        backgroundColor: '#1a1a2e',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        width: '100%',
        maxWidth: 360,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    modalCloseBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#ffffff',
        marginTop: 16,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.6)',
        marginTop: 8,
        textAlign: 'center',
    },
    codeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        borderRadius: 16,
        paddingHorizontal: 24,
        paddingVertical: 16,
        marginTop: 24,
        gap: 16,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.3)',
    },
    codeText: {
        fontSize: 32,
        fontWeight: '900',
        color: '#ffffff',
        letterSpacing: 4,
    },
    copyBtn: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 8,
        borderRadius: 8,
    },
    waitingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    waitingText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.6)',
        fontWeight: '500',
    },
    startButton: {
        backgroundColor: '#8b5cf6',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 16,
        marginTop: 24,
        width: '100%',
        alignItems: 'center',
    },
    startButtonText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#ffffff',
    },
    codeInput: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
        padding: 20,
        fontSize: 24,
        color: '#ffffff',
        textAlign: 'center',
        fontWeight: '800',
        letterSpacing: 4,
        marginTop: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    joinButton: {
        backgroundColor: '#22c55e',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 16,
        marginTop: 24,
        width: '100%',
        alignItems: 'center',
    },
    joinButtonDisabled: {
        opacity: 0.5,
    },
    joinButtonText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#ffffff',
    },
    bottomActions: {
        paddingHorizontal: 16,
        paddingBottom: Platform.OS === 'ios' ? 0 : 20,
    },
});

export default BattleMenuScreen;
