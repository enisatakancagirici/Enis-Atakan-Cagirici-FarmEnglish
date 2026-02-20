/**
 * BattleMenuScreen - Battle Mode Entry Point
 * FarmEnglish Battle Mode
 * 
 * Özellikler:
 * - Hızlı Eşleşme (otomatik matchmaking)
 * - Arkadaşla Savaş (oda kodu ile)
 * - Liderlik Tablosu
 */

import React, { useState, useCallback, memo, useMemo } from 'react';
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
import { Swords, Trophy, Users, ChevronRight, Lock, Crown, Copy, X } from 'lucide-react-native';
import { useFarmStore } from '../store/farmStore';
import { haptic } from '../utils/sound';
import { createBattleRoom, joinBattleRoom, generateBattleQuestions, listenToBattle, startBattle } from '../utils/firebaseBattle';
import * as Clipboard from 'expo-clipboard';
import NetInfo from '@react-native-community/netinfo';

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

const WAR_THEME = {
    screenGradient: ['#05080f', '#0f172a', '#1e293b'] as const,
    cardBase: '#0b1220',
    cardBorder: 'rgba(248, 113, 113, 0.25)',
    textPrimary: '#f8fafc',
    textMuted: 'rgba(226, 232, 240, 0.74)',
    ctaBorder: 'rgba(251, 146, 60, 0.5)',
    ctaText: '#fdba74',
    lockedGradient: ['#0b1220', '#111827'] as const,
    quickMatchGradient: ['#7f1d1d', '#b91c1c'] as const,
    createRoomGradient: ['#7c2d12', '#ea580c'] as const,
    joinRoomGradient: ['#1f2937', '#0f766e'] as const,
    modalBackground: '#0a1120',
};

interface BattleMenuScreenProps {
    navigation: any;
}

// Mode Card Component
const ModeCard = memo(({
    title,
    description,
    icon,
    gradient,
    onPress,
    locked,
    lockReason,
    tag,
    RS,
}: {
    title: string;
    description: string;
    icon: React.ReactNode;
    gradient: readonly [string, string, ...string[]];
    onPress: () => void;
    locked?: boolean;
    lockReason?: string;
    tag?: string;
    RS: any;
}) => (
    <Pressable
        style={[
            styles.modeCard,
            !locked && { borderColor: `${gradient[0]}7a`, shadowColor: gradient[0] },
            locked && styles.modeCardLocked,
        ]}
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
            colors={locked ? WAR_THEME.lockedGradient : gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.modeCardGradient, { padding: RS.cardPadding }]}
        >
            {!!tag && !locked && (
                <View style={styles.modeTag}>
                    <Text style={styles.modeTagText}>{tag}</Text>
                </View>
            )}
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

                    <Swords color="#fb7185" size={48} />
                    <Text style={styles.modalTitle}>Oda Oluşturuldu!</Text>
                    <Text style={styles.modalSubtitle}>
                        Bu kodu arkadaşınla paylaş
                    </Text>

                    <View style={styles.codeContainer}>
                        <Text style={styles.codeText}>{roomCode}</Text>
                        <Pressable style={styles.copyBtn} onPress={copyCode}>
                            <Copy color="#fb7185" size={20} />
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

                        <Users color="#fb923c" size={48} />
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
    const battlePower = useMemo(
        () => Math.max(1, Math.round((battleWins * 4) + (bestBattleStreak * 8) + (currentBattleStreak * 6) + (winRate * 3))),
        [battleWins, bestBattleStreak, currentBattleStreak, winRate],
    );
    const arenaTier = useMemo(() => {
        if (battleWins >= 180 && winRate >= 72) {
            return { title: 'WARLORD', subtitle: 'Zirve seviyesi - baskın üstünlük', color: '#fda4af' };
        }
        if (battleWins >= 90 && winRate >= 60) {
            return { title: 'COMMANDER', subtitle: 'Kontrollü oyun - istikrarlı seri', color: '#fdba74' };
        }
        if (battleWins >= 30 || winRate >= 50) {
            return { title: 'CONTENDER', subtitle: 'Yükseliş başladı - ritmi koru', color: '#facc15' };
        }
        return { title: 'ROOKIE', subtitle: 'İlk savaşlar - ivme topla', color: '#93c5fd' };
    }, [battleWins, winRate]);
    const readinessPct = useMemo(
        () => Math.max(5, Math.min(100, Math.round((winRate * 0.6) + (Math.min(35, bestBattleStreak) * 1.2) + (Math.min(20, currentBattleStreak) * 1.8)))),
        [winRate, bestBattleStreak, currentBattleStreak],
    );

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
    const ensureInternetConnection = useCallback(async () => {
        try {
            const netState = await NetInfo.fetch();
            const connected = netState.isConnected !== false;
            const reachable = netState.isInternetReachable !== false;
            const hasInternet = connected && reachable;

            if (!hasInternet) {
                Alert.alert(
                    'İnternet Gerekli',
                    'Savaş moduna girmek, rakip bulmak ve liderlik tablosunu görmek için internet bağlantısı gerekir.'
                );
                haptic.error();
                return false;
            }

            return true;
        } catch {
            // NetInfo beklenmedik hata verirse akışı bloklamayalım.
            return true;
        }
    }, []);

    const handleQuickMatch = useCallback(async () => {
        const canProceed = await ensureInternetConnection();
        if (!canProceed) return;

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
    }, [navigation, user, getBattleNickname, ensureInternetConnection]);

    const handleCreateRoom = useCallback(async () => {
        const canProceed = await ensureInternetConnection();
        if (!canProceed) return;

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
    }, [isAuthenticated, user, nickname, navigation, farm, pool, ensureInternetConnection]);

    const handleJoinRoom = useCallback(async (code: string) => {
        const canProceed = await ensureInternetConnection();
        if (!canProceed) return;

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
    }, [isAuthenticated, user, nickname, navigation, level, ensureInternetConnection]);

    const handleStartBattle = useCallback(() => {
        if (battleId) {
            setShowCreateRoom(false);
            navigation.navigate('Battle', { mode: 'friendBattle', battleId });
        }
    }, [battleId, navigation]);

    const handleLeaderboard = useCallback(async () => {
        const canProceed = await ensureInternetConnection();
        if (!canProceed) return;
        navigation.navigate('Leaderboard');
    }, [navigation, ensureInternetConnection]);

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
        <LinearGradient colors={WAR_THEME.screenGradient} style={styles.container}>
            <SafeAreaView style={styles.container}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={[styles.header, { paddingHorizontal: RS.containerPadding }]}>
                        <Pressable style={styles.backButton} onPress={handleBack}>
                            <ChevronRight color="#fff" size={24} style={{ transform: [{ rotate: '180deg' }] }} />
                        </Pressable>
                        <View style={styles.headerTitleContainer}>
                            <Swords color="#fb7185" size={RS.iconSize} />
                            <Text style={[styles.headerTitle, { fontSize: RS.titleSize }]}>Savaş Modu</Text>
                        </View>
                        <View style={styles.headerSpacer} />
                    </View>

                    {/* Content Wrapper for Tablet Centering */}
                    <View style={[styles.contentWrapper, { paddingHorizontal: RS.containerPadding }]}>
                        <View style={contentStyle}>
                            <View style={styles.arenaHero}>
                                <LinearGradient
                                    colors={['rgba(127, 29, 29, 0.62)', 'rgba(124, 45, 18, 0.48)', 'rgba(15, 23, 42, 0.82)']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.arenaHeroGradient}
                                >
                                    <View style={styles.arenaHeroTop}>
                                        <View style={styles.arenaHeroTextWrap}>
                                            <Text style={styles.arenaHeroKicker}>ARENA ÖZETİ</Text>
                                            <Text style={[styles.arenaHeroTier, { color: arenaTier.color }]}>{arenaTier.title}</Text>
                                            <Text style={styles.arenaHeroSubtitle}>{arenaTier.subtitle}</Text>
                                        </View>
                                        <View style={styles.powerBadge}>
                                            <Text style={styles.powerLabel}>POWER</Text>
                                            <Text style={styles.powerValue}>{battlePower}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.heroStatsRow}>
                                        <View style={styles.heroStatChip}>
                                            <Text style={styles.heroStatLabel}>Wins</Text>
                                            <Text style={styles.heroStatValue}>{battleWins}</Text>
                                        </View>
                                        <View style={styles.heroStatChip}>
                                            <Text style={styles.heroStatLabel}>Win Rate</Text>
                                            <Text style={styles.heroStatValue}>%{winRate}</Text>
                                        </View>
                                        <View style={styles.heroStatChip}>
                                            <Text style={styles.heroStatLabel}>Best</Text>
                                            <Text style={styles.heroStatValue}>{bestBattleStreak}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.readinessTrack}>
                                        <View style={[styles.readinessFill, { width: `${readinessPct}%` }]} />
                                        <Text style={styles.readinessText}>Hazırlık %{readinessPct}</Text>
                                    </View>
                                </LinearGradient>
                            </View>

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

                            {/* ğŸ† Leaderboard Link - Prominent Position */}
                            <Pressable style={styles.leaderboardLinkTop} onPress={handleLeaderboard}>
                                <Trophy color={WAR_THEME.ctaText} size={22} />
                                <Text style={styles.leaderboardTextTop}>Liderlik Tablosunu Gör</Text>
                                <ChevronRight color={WAR_THEME.ctaText} size={20} />
                            </Pressable>

                            {/* Mode Cards */}
                            <View style={[styles.modesContainer, { gap: RS.containerPadding }]}>
                                <Text style={[styles.sectionTitle, { fontSize: RS.cardTitleSize }]}>Savaş Modları</Text>

                                <ModeCard
                                    title="Hızlı Eşleşme"
                                    description="Anında rakip bul ve maça gir"
                                    icon={<Swords color="#fff" size={RS.iconSize * 1.5} />}
                                    tag="CANLI"
                                    gradient={WAR_THEME.quickMatchGradient}
                                    onPress={handleQuickMatch}
                                    locked={!isAuthenticated}
                                    lockReason="Kayıt olarak erişin"
                                    RS={RS}
                                />

                                <ModeCard
                                    title="Oda Oluştur"
                                    description="Oda kur ve arkadaşını davet et"
                                    icon={<Crown color="#fff" size={RS.iconSize * 1.5} />}
                                    tag="TAKTIK"
                                    gradient={WAR_THEME.createRoomGradient}
                                    onPress={handleCreateRoom}
                                    locked={!isAuthenticated}
                                    lockReason="Kayıt olarak erişin"
                                    RS={RS}
                                />

                                <ModeCard
                                    title="Odaya Katıl"
                                    description="Kodla odaya hızlı şekilde katıl"
                                    icon={<Users color="#fff" size={RS.iconSize * 1.5} />}
                                    tag="DUO"
                                    gradient={WAR_THEME.joinRoomGradient}
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
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.34)',
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
        color: WAR_THEME.textPrimary,
        textShadowColor: 'rgba(251, 113, 133, 0.35)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    },
    headerSpacer: {
        width: 40,
    },
    // Content Wrapper for Tablet
    contentWrapper: {
        flex: 1,
        width: '100%',
    },
    arenaHero: {
        borderRadius: 22,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(251, 113, 133, 0.42)',
        marginBottom: 18,
        shadowColor: '#7f1d1d',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.26,
        shadowRadius: 18,
        elevation: 10,
    },
    arenaHeroGradient: {
        padding: 16,
        gap: 12,
    },
    arenaHeroTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    arenaHeroTextWrap: {
        flex: 1,
        gap: 3,
    },
    arenaHeroKicker: {
        color: 'rgba(251, 113, 133, 0.9)',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.2,
    },
    arenaHeroTier: {
        fontSize: 26,
        fontWeight: '900',
        lineHeight: 30,
    },
    arenaHeroSubtitle: {
        color: 'rgba(226, 232, 240, 0.84)',
        fontSize: 13,
        fontWeight: '600',
    },
    powerBadge: {
        minWidth: 94,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(2, 6, 23, 0.56)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.44)',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    powerLabel: {
        color: 'rgba(251, 191, 36, 0.9)',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    powerValue: {
        marginTop: 2,
        color: '#fde68a',
        fontSize: 24,
        fontWeight: '900',
        lineHeight: 26,
    },
    heroStatsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    heroStatChip: {
        flex: 1,
        backgroundColor: 'rgba(2, 6, 23, 0.54)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.24)',
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    heroStatLabel: {
        color: 'rgba(203, 213, 225, 0.72)',
        fontSize: 11,
        fontWeight: '600',
    },
    heroStatValue: {
        marginTop: 2,
        color: '#f8fafc',
        fontSize: 16,
        fontWeight: '900',
    },
    readinessTrack: {
        height: 34,
        borderRadius: 12,
        overflow: 'hidden',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.74)',
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.24)',
    },
    readinessFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: 'rgba(251, 146, 60, 0.42)',
    },
    readinessText: {
        textAlign: 'center',
        color: '#fed7aa',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    // Auth Warning
    authWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(127, 29, 29, 0.35)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(248, 113, 113, 0.45)',
    },
    authWarningText: {
        flex: 1,
        color: '#fecaca',
        fontSize: 14,
        fontWeight: '600',
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
        borderColor: WAR_THEME.cardBorder,
        backgroundColor: WAR_THEME.cardBase,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 18,
        elevation: 10,
    },
    modeCardLocked: {
        opacity: 0.7,
        borderColor: 'rgba(148, 163, 184, 0.2)',
    },
    modeCardGradient: {
        padding: 24,
    },
    modeTag: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(2, 6, 23, 0.55)',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.55)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginBottom: 10,
    },
    modeTagText: {
        color: '#fcd34d',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.6,
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
        backgroundColor: 'rgba(15, 23, 42, 0.42)',
        borderWidth: 1,
        borderColor: 'rgba(226, 232, 240, 0.25)',
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
        borderColor: WAR_THEME.cardBase,
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
        color: WAR_THEME.textMuted,
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
        backgroundColor: 'rgba(124, 45, 18, 0.34)',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 16,
        gap: 10,
        borderWidth: 1.5,
        borderColor: WAR_THEME.ctaBorder,
        marginBottom: 20,
    },
    leaderboardTextTop: {
        color: WAR_THEME.ctaText,
        fontSize: 16,
        fontWeight: '800',
        flex: 1,
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(2, 6, 23, 0.9)',
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
        backgroundColor: WAR_THEME.modalBackground,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        width: '100%',
        maxWidth: 360,
        borderWidth: 1,
        borderColor: 'rgba(248, 113, 113, 0.32)',
    },
    modalCloseBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.35)',
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
        color: WAR_THEME.textMuted,
        marginTop: 8,
        textAlign: 'center',
    },
    codeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(127, 29, 29, 0.35)',
        borderRadius: 16,
        paddingHorizontal: 24,
        paddingVertical: 16,
        marginTop: 24,
        gap: 16,
        borderWidth: 1,
        borderColor: 'rgba(248, 113, 113, 0.38)',
    },
    codeText: {
        fontSize: 32,
        fontWeight: '900',
        color: '#ffffff',
        letterSpacing: 4,
    },
    copyBtn: {
        backgroundColor: 'rgba(15, 23, 42, 0.82)',
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(251, 113, 133, 0.35)',
    },
    waitingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 24,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.28)',
    },
    waitingText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.6)',
        fontWeight: '500',
    },
    startButton: {
        backgroundColor: '#b91c1c',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 16,
        marginTop: 24,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(251, 113, 133, 0.52)',
    },
    startButtonText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#ffffff',
    },
    codeInput: {
        width: '100%',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        borderRadius: 16,
        padding: 20,
        fontSize: 24,
        color: '#ffffff',
        textAlign: 'center',
        fontWeight: '800',
        letterSpacing: 4,
        marginTop: 24,
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.34)',
    },
    joinButton: {
        backgroundColor: '#ea580c',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 16,
        marginTop: 24,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(251, 146, 60, 0.5)',
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
