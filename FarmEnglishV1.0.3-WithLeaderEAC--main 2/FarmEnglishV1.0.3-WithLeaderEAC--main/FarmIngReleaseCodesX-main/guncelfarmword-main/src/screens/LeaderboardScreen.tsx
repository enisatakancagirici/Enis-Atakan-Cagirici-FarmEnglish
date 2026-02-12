/**
 * LeaderboardScreen - Liderlik Tablosu
 * FarmEnglish Battle Mode
 *
 * Rütbe sistemi ile genel sıralama + Savaşçılar & Çiftçiler alt tabları
 * Askeri rütbeler: Mareşal → Er (sıralamaya göre)
 */

import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Trophy,
    Crown,
    Medal,
    ChevronRight,
    RefreshCw,
    Wheat,
    Star,
    Shield,
    Info,
} from 'lucide-react-native';
import { useFarmStore } from '../store/farmStore';
import { haptic } from '../utils/sound';
import {
    getLeaderboard,
    listenToLeaderboard,
    LeaderboardEntry,
    computeGeneralScore,
} from '../utils/firebaseBattle';

// ─── Responsive ───────────────────────────────────────
const getRS = (w: number, h: number) => {
    const small = h < 700;
    const tablet = Math.min(w, h) >= 600;
    const landscape = w > h;
    return {
        headerH: small ? 56 : 64,
        title: tablet ? 26 : small ? 18 : 22,
        tab: tablet ? 15 : 13,
        rank: tablet ? 18 : 15,
        name: tablet ? 18 : 15,
        stat: tablet ? 15 : 13,
        icon: tablet ? 26 : 22,
        pad: tablet ? 24 : 16,
        itemPad: tablet ? 16 : 12,
        tablet,
        landscape,
        width: tablet || landscape ? Math.min(w - 48, 600) : ('100%' as any),
    };
};

// ─── Askeri Rütbe Sistemi ─────────────────────────────
interface MilitaryRank {
    title: string;
    badge: string;
    color: string;
    glow: string;
}

function getMilitaryRank(position: number): MilitaryRank {
    if (position === 1)
        return { title: 'Mareşal', badge: '🎖️', color: '#ffd700', glow: 'rgba(255,215,0,0.3)' };
    if (position === 2)
        return { title: 'Orgeneral', badge: '⭐⭐⭐⭐', color: '#e5e7eb', glow: 'rgba(229,231,235,0.2)' };
    if (position === 3)
        return { title: 'Korgeneral', badge: '⭐⭐⭐', color: '#cd7f32', glow: 'rgba(205,127,50,0.2)' };
    if (position <= 5)
        return { title: 'Tümgeneral', badge: '⭐⭐', color: '#a78bfa', glow: 'rgba(167,139,250,0.15)' };
    if (position <= 10)
        return { title: 'Tuğgeneral', badge: '⭐', color: '#818cf8', glow: 'rgba(129,140,248,0.12)' };
    if (position <= 15)
        return { title: 'Albay', badge: '🎯', color: '#60a5fa', glow: 'rgba(96,165,250,0.1)' };
    if (position <= 25)
        return { title: 'Yarbay', badge: '🛡️', color: '#34d399', glow: 'rgba(52,211,153,0.1)' };
    if (position <= 35)
        return { title: 'Binbaşı', badge: '⚔️', color: '#fbbf24', glow: 'rgba(251,191,36,0.08)' };
    if (position <= 50)
        return { title: 'Yüzbaşı', badge: '🗡️', color: '#f97316', glow: 'rgba(249,115,22,0.08)' };
    if (position <= 75)
        return { title: 'Üsteğmen', badge: '🔰', color: '#94a3b8', glow: 'rgba(148,163,184,0.06)' };
    if (position <= 100)
        return { title: 'Teğmen', badge: '📌', color: '#94a3b8', glow: 'rgba(148,163,184,0.05)' };
    if (position <= 200)
        return { title: 'Asteğmen', badge: '🔹', color: '#64748b', glow: 'rgba(100,116,139,0.04)' };
    return { title: 'Er', badge: '🔸', color: '#475569', glow: 'rgba(71,85,105,0.03)' };
}

// ─── Tab Types ────────────────────────────────────────
type TabType = 'general' | 'battle' | 'harvest';

function getSpecialTitle(tabType: TabType, position: number): string | null {
    if (position < 1 || position > 5) return null;

    const titleMap: Record<TabType, string[]> = {
        general: [
            'Efsane Lider',
            'Tahtın Varisi',
            'Zirve Takipçisi',
            'Seçkin Komutan',
            'Seçkin Komutan',
        ],
        battle: [
            'En İyi Savaşçı',
            'Arena Ustası',
            'Demir Yumruk',
            'Savaş Elçisi',
            'Savaş Elçisi',
        ],
        harvest: [
            'En İyi Çiftçi',
            'Altın Orak',
            'Bereket Ustası',
            'Tarla Yıldızı',
            'Tarla Yıldızı',
        ],
    };

    return titleMap[tabType][position - 1] || null;
}

const TABS: { key: TabType; label: string; icon: (active: boolean, size: number) => React.ReactNode }[] = [
    {
        key: 'general',
        label: 'Genel',
        icon: (a, s) => <Star color={a ? '#fff' : 'rgba(255,255,255,0.5)'} size={s} fill={a ? '#fff' : 'none'} />,
    },
    {
        key: 'battle',
        label: 'Savaşçılar',
        icon: (a, s) => <Trophy color={a ? '#fff' : 'rgba(255,255,255,0.5)'} size={s} />,
    },
    {
        key: 'harvest',
        label: 'Çiftçiler',
        icon: (a, s) => <Wheat color={a ? '#fff' : 'rgba(255,255,255,0.5)'} size={s} />,
    },
];

// ─── Tab Button ───────────────────────────────────────
const TabButton = memo(
    ({
        label,
        icon,
        active,
        onPress,
        fontSize,
    }: {
        label: string;
        icon: React.ReactNode;
        active: boolean;
        onPress: () => void;
        fontSize: number;
    }) => (
        <Pressable style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
            {icon}
            <Text style={[styles.tabLabel, active && styles.tabLabelActive, { fontSize }]}>{label}</Text>
        </Pressable>
    ),
);

// ─── Top-3 Podium Card ───────────────────────────────
const PodiumCard = memo(
    ({
        entry,
        position,
        isCurrentUser,
        RS,
        tabType,
    }: {
        entry: LeaderboardEntry;
        position: 1 | 2 | 3;
        isCurrentUser: boolean;
        RS: ReturnType<typeof getRS>;
        tabType: TabType;
    }) => {
        const rank = getMilitaryRank(position);
        const specialTitle = getSpecialTitle(tabType, position);

        // 🏆 Mareşal (1.) çok daha görkemli
        const is1st = position === 1;
        const is2nd = position === 2;

        const bg = is1st
            ? 'rgba(255,215,0,0.18)'
            : is2nd
              ? 'rgba(192,192,192,0.10)'
              : 'rgba(205,127,50,0.08)';
        const border = is1st
            ? 'rgba(255,215,0,0.55)'
            : is2nd
              ? 'rgba(192,192,192,0.25)'
              : 'rgba(205,127,50,0.25)';
        const iconSize = is1st ? RS.icon + 14 : RS.icon;

        const scoreValue = useMemo(() => getDisplayScore(entry, tabType), [entry, tabType]);

        return (
            <View
                style={[
                    styles.podiumCard,
                    {
                        backgroundColor: bg,
                        borderColor: border,
                        borderWidth: is1st ? 2.5 : 1.5,
                        flex: is1st ? 1.5 : 1,
                        paddingVertical: is1st ? 24 : 14,
                        // 2. ve 3. daha aşağıda — marginTop ile
                        marginTop: is1st ? 0 : 40,
                        // 🏆 Görkemli glow efektleri
                        ...(is1st ? {
                            shadowColor: '#ffd700',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.65,
                            shadowRadius: 24,
                            elevation: 16,
                        } : is2nd ? {
                            shadowColor: '#c0c0c0',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.3,
                            shadowRadius: 10,
                            elevation: 5,
                        } : {
                            shadowColor: '#cd7f32',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.25,
                            shadowRadius: 8,
                            elevation: 4,
                        }),
                    },
                    isCurrentUser && { borderColor: '#8b5cf6', borderWidth: 2.5 },
                ]}
            >
                {/* 🏆 Mareşal için altın çerçeve glow overlay */}
                {is1st && (
                    <View style={{
                        position: 'absolute', top: -2, left: -2, right: -2, bottom: -2,
                        borderRadius: 18,
                        borderWidth: 1.5,
                        borderColor: 'rgba(255,215,0,0.3)',
                    }} pointerEvents="none" />
                )}

                {/* Position number */}
                <View style={{
                    position: 'absolute', top: is1st ? 8 : 6, left: is1st ? 10 : 8,
                    width: is1st ? 28 : 22, height: is1st ? 28 : 22, borderRadius: is1st ? 14 : 11,
                    backgroundColor: is1st ? 'rgba(255,215,0,0.3)' : is2nd ? 'rgba(192,192,192,0.2)' : 'rgba(205,127,50,0.2)',
                    alignItems: 'center', justifyContent: 'center',
                }}>
                    <Text style={{ fontSize: is1st ? 14 : 11, fontWeight: '900', color: is1st ? '#ffd700' : is2nd ? '#c0c0c0' : '#cd7f32' }}>
                        {position}
                    </Text>
                </View>

                {/* Crown / Medal — Mareşal için çift taç */}
                <View style={[styles.podiumIconWrap, is1st && { marginBottom: 8 }]}>
                    {is1st ? (
                        <View style={{ alignItems: 'center' }}>
                            <Crown color="#ffd700" size={iconSize} fill="#ffd700" />
                            <Text style={{ fontSize: 10, color: 'rgba(255,215,0,0.7)', fontWeight: '800', marginTop: 2, letterSpacing: 2 }}>★ ★ ★</Text>
                        </View>
                    ) : is2nd ? (
                        <Medal color="#c0c0c0" size={iconSize} />
                    ) : (
                        <Medal color="#cd7f32" size={iconSize} />
                    )}
                </View>

                {/* Badge + rank title — Mareşal için büyük badge */}
                <Text style={[styles.podiumBadge, { fontSize: is1st ? 28 : 16 }]}>{rank.badge}</Text>

                {/* Nickname */}
                <Text
                    style={[
                        styles.podiumName,
                        {
                            fontSize: is1st ? RS.name + 2 : RS.name - 1,
                            color: isCurrentUser ? '#a78bfa' : '#fff',
                            ...(is1st && { textShadowColor: 'rgba(255,215,0,0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 }),
                        },
                    ]}
                    numberOfLines={1}
                >
                    {entry.nickname}
                </Text>

                {/* Military rank — Mareşal daha büyük */}
                <Text style={[
                    styles.podiumRankTitle,
                    {
                        color: rank.color,
                        fontSize: is1st ? 14 : 11,
                        fontWeight: is1st ? '900' : '700',
                        ...(is1st && { textShadowColor: 'rgba(255,215,0,0.3)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6 }),
                    },
                ]}>
                    {rank.title}
                </Text>
                {!!specialTitle && (
                    <Text style={styles.podiumSpecialTitle}>{specialTitle}</Text>
                )}

                {/* Score — Mareşal daha görkemli */}
                <Text style={[
                    styles.podiumScore,
                    {
                        fontSize: is1st ? RS.stat + 4 : RS.stat,
                        color: is1st ? '#ffd700' : is2nd ? '#e5e7eb' : '#cd7f32',
                        ...(is1st && { textShadowColor: 'rgba(255,215,0,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 }),
                    },
                ]}>
                    {scoreValue}
                </Text>
                <Text style={{ fontSize: is1st ? 11 : 9, color: is1st ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.4)', fontWeight: '600', marginTop: 1 }}>
                    {tabType === 'harvest' ? 'hasat' : 'puan'}
                </Text>
            </View>
        );
    },
);

// ─── Regular List Item ────────────────────────────────
const LeaderboardItem = memo(
    ({
        entry,
        position,
        isCurrentUser,
        RS,
        tabType,
    }: {
        entry: LeaderboardEntry;
        position: number;
        isCurrentUser: boolean;
        RS: ReturnType<typeof getRS>;
        tabType: TabType;
    }) => {
        const rank = getMilitaryRank(position);
        const specialTitle = getSpecialTitle(tabType, position);
        const scoreValue = useMemo(() => getDisplayScore(entry, tabType), [entry, tabType]);

        return (
            <View
                style={[
                    styles.listItem,
                    { backgroundColor: rank.glow, padding: RS.itemPad },
                    isCurrentUser && styles.listItemCurrent,
                ]}
            >
                {/* Position # */}
                <View style={styles.posCol}>
                    <Text style={[styles.posText, { fontSize: RS.rank }]}>{position}</Text>
                </View>

                {/* Badge + User info */}
                <View style={styles.userCol}>
                    <View style={styles.nameRow}>
                        <Text style={styles.badgeText}>{rank.badge}</Text>
                        <Text
                            style={[
                                styles.nameText,
                                { fontSize: RS.name },
                                isCurrentUser && { color: '#a78bfa' },
                            ]}
                            numberOfLines={1}
                        >
                            {entry.nickname}
                            {isCurrentUser ? ' (Sen)' : ''}
                        </Text>
                    </View>
                    <Text style={[styles.rankLabel, { color: rank.color }]}>
                        {specialTitle ? `${rank.title} • ${specialTitle}` : rank.title}
                    </Text>
                </View>

                {/* Score */}
                <View style={styles.scoreCol}>
                    <Text style={[styles.scoreText, { fontSize: RS.stat }]}>{scoreValue}</Text>
                    <Text style={styles.scoreUnit}>{tabType === 'harvest' ? 'hasat' : 'puan'}</Text>
                </View>
            </View>
        );
    },
);

// ─── Score Display Helper ─────────────────────────────
function getDisplayScore(entry: LeaderboardEntry, tabType: TabType): string {
    if (tabType === 'general') {
        const gs = entry.generalScore ?? computeGeneralScore(entry);
        return gs.toLocaleString('tr-TR');
    }
    if (tabType === 'battle') return (entry.wins || 0).toLocaleString('tr-TR');
    if (tabType === 'harvest') return (entry.harvestCount || 0).toLocaleString('tr-TR');
    return '0';
}

// ─── Score Formula Explanation ────────────────────────
const SCORE_FORMULA_ITEMS = [
    { emoji: '⚔️', label: 'Savaş Galibiyeti', multiplier: '×50', color: '#ef4444' },
    { emoji: '🌾', label: 'Hasat', multiplier: '×100', color: '#22c55e' },
    { emoji: '🧩', label: 'Yapboz Puanı', multiplier: '×3', color: '#f97316' },
    { emoji: '🗣️', label: 'Sesyap Puanı', multiplier: '×0.5', color: '#3b82f6' },
    { emoji: '🏆', label: 'Kupa', multiplier: '×5', color: '#eab308' },
    { emoji: '📝', label: 'Pratik Puanı', multiplier: '×2', color: '#8b5cf6' },
    { emoji: '🔥', label: 'Seri (Streak)', multiplier: '×15', color: '#f43f5e' },
];

const ScoreFormulaPanel = memo(({ visible, RS }: { visible: boolean; RS: ReturnType<typeof getRS> }) => {
    if (!visible) return null;
    return (
        <View style={leaderStyles.formulaPanel}>
            <LinearGradient
                colors={['rgba(139,92,246,0.15)', 'rgba(59,130,246,0.10)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
            />
            <Text style={leaderStyles.formulaTitle}>📊 Puan Hesaplaması</Text>
            <View style={leaderStyles.formulaGrid}>
                {SCORE_FORMULA_ITEMS.map((item) => (
                    <View key={item.label} style={leaderStyles.formulaRow}>
                        <Text style={leaderStyles.formulaEmoji}>{item.emoji}</Text>
                        <Text style={leaderStyles.formulaLabel}>{item.label}</Text>
                        <View style={[leaderStyles.formulaMultiplierBadge, { backgroundColor: item.color + '25' }]}>
                            <Text style={[leaderStyles.formulaMultiplier, { color: item.color }]}>{item.multiplier}</Text>
                        </View>
                    </View>
                ))}
            </View>
            <Text style={leaderStyles.formulaNote}>
                Genel puan = Her kategorideki puanın çarpanı ile toplamıdır
            </Text>
        </View>
    );
});

// ═══════════════════════════════════════════════════════
//                   MAIN COMPONENT
// ═══════════════════════════════════════════════════════
interface Props {
    navigation: any;
}

export const LeaderboardScreen: React.FC<Props> = ({ navigation }) => {
    const { width: ww, height: wh } = useWindowDimensions();
    const RS = getRS(ww, wh);

    const [activeTab, setActiveTab] = useState<TabType>('general');
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showFormula, setShowFormula] = useState(false);

    const user = useFarmStore((s) => s.user);
    const currentOdId = user?.odId;

    // ── Load ──────────────────────────────────────────
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getLeaderboard(activeTab, 50);
            setLeaderboard(data);
        } catch (e) {
            console.error('Liderlik tablosu hatası:', e);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        load();
    }, [load]);

    // ── Real-time listener ────────────────────────────
    useEffect(() => {
        const unsub = listenToLeaderboard(
            (entries) => {
                setLeaderboard(entries);
                setLoading(false);
            },
            (err) => console.error('Liderlik dinleme hatası:', err),
            50,
            activeTab,
        );
        return () => unsub();
    }, [activeTab]);

    // ── Refresh ───────────────────────────────────────
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        haptic.light();
        await load();
        setRefreshing(false);
    }, [load]);

    // ── Current user rank ─────────────────────────────
    const currentUserIdx = leaderboard.findIndex((e) => e.odId === currentOdId);
    const currentUserRank = currentUserIdx >= 0 ? currentUserIdx + 1 : -1;
    const currentMilRank = currentUserRank > 0 ? getMilitaryRank(currentUserRank) : null;
    const currentSpecialTitle = currentUserRank > 0 ? getSpecialTitle(activeTab, currentUserRank) : null;

    // ── Top 3 & rest ──────────────────────────────────
    const top3 = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3);

    // ── Renderers ─────────────────────────────────────
    const renderItem = useCallback(
        ({ item, index }: { item: LeaderboardEntry; index: number }) => (
            <LeaderboardItem
                entry={item}
                position={index + 4} // +4 because top 3 shown as podium
                isCurrentUser={item.odId === currentOdId}
                RS={RS}
                tabType={activeTab}
            />
        ),
        [currentOdId, RS, activeTab],
    );

    const keyExtractor = useCallback((item: LeaderboardEntry) => item.odId, []);

    const contentStyle: any = {
        width: typeof RS.width === 'number' ? RS.width : '100%',
        alignSelf: 'center' as const,
    };

    // ── Tab title helper ──────────────────────────────
    const headerLabel =
        activeTab === 'general'
            ? 'Genel Sıralama'
            : activeTab === 'battle'
              ? 'Savaşçılar'
              : 'Çiftçiler';

    return (
        <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.flex}>
            <SafeAreaView style={styles.flex}>
                {/* ── Header ── */}
                <View style={[styles.header, { paddingHorizontal: RS.pad }]}>
                    <Pressable
                        style={styles.circleBtn}
                        onPress={() => {
                            haptic.light();
                            navigation.goBack();
                        }}
                    >
                        <ChevronRight color="#fff" size={22} style={{ transform: [{ rotate: '180deg' }] }} />
                    </Pressable>

                    <View style={styles.headerCenter}>
                        <Shield color="#a78bfa" size={RS.icon} />
                        <Text style={[styles.headerTitle, { fontSize: RS.title }]}>{headerLabel}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable style={styles.circleBtn} onPress={() => { haptic.light(); setShowFormula(!showFormula); }}>
                            <Info color={showFormula ? '#a78bfa' : '#fff'} size={18} />
                        </Pressable>
                        <Pressable style={styles.circleBtn} onPress={handleRefresh}>
                            <RefreshCw color="#fff" size={18} />
                        </Pressable>
                    </View>
                </View>

                {/* ── Content ── */}
                <View style={[styles.flex, { paddingHorizontal: RS.pad }]}>
                    <View style={contentStyle}>
                        {/* ── Tabs ── */}
                        <View style={styles.tabRow}>
                            {TABS.map((t) => (
                                <TabButton
                                    key={t.key}
                                    label={t.label}
                                    icon={t.icon(activeTab === t.key, 16)}
                                    active={activeTab === t.key}
                                    onPress={() => {
                                        haptic.light();
                                        setActiveTab(t.key);
                                    }}
                                    fontSize={RS.tab}
                                />
                            ))}
                        </View>

                        {/* ── Score Formula Panel ── */}
                        {activeTab === 'general' && <ScoreFormulaPanel visible={showFormula} RS={RS} />}

                        {/* ── Current User Rank Banner ── */}
                        {currentUserRank > 3 && currentMilRank && (
                            <View style={styles.rankBanner}>
                                <Text style={styles.rankBannerText}>
                                    {currentMilRank.badge} Sıralaman:{' '}
                                    <Text style={[styles.rankBannerNum, { color: currentMilRank.color }]}>
                                        #{currentUserRank}
                                    </Text>
                                    {'  '}
                                    <Text style={[styles.rankBannerTitle, { color: currentMilRank.color }]}>
                                        {currentSpecialTitle ? `${currentMilRank.title} • ${currentSpecialTitle}` : currentMilRank.title}
                                    </Text>
                                </Text>
                            </View>
                        )}

                        {/* ── Loading / Empty / List ── */}
                        {loading ? (
                            <View style={styles.center}>
                                <ActivityIndicator size="large" color="#8b5cf6" />
                                <Text style={styles.loadingLabel}>Yükleniyor...</Text>
                            </View>
                        ) : leaderboard.length === 0 ? (
                            <View style={styles.center}>
                                <Shield color="rgba(255,255,255,0.25)" size={64} />
                                <Text style={styles.emptyTitle}>Henüz kimse yok</Text>
                                <Text style={styles.emptySub}>
                                    {activeTab === 'harvest'
                                        ? 'Kelimeleri hasat ederek liderlik tablosuna gir!'
                                        : activeTab === 'battle'
                                          ? 'Savaşa katılarak liderlik tablosuna gir!'
                                          : 'Oyun oynayarak rütbeni yükselt!'}
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={rest}
                                renderItem={renderItem}
                                keyExtractor={keyExtractor}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 40 }}
                                refreshControl={
                                    <RefreshControl
                                        refreshing={refreshing}
                                        onRefresh={handleRefresh}
                                        tintColor="#8b5cf6"
                                    />
                                }
                                ListHeaderComponent={
                                    <>
                                        {/* ── Top 3 Podium ── */}
                                        {top3.length > 0 && (
                                            <View style={styles.podiumRow}>
                                                {/* 2nd place */}
                                                {top3.length >= 2 && (
                                                    <PodiumCard
                                                        entry={top3[1]}
                                                        position={2}
                                                        isCurrentUser={top3[1].odId === currentOdId}
                                                        RS={RS}
                                                        tabType={activeTab}
                                                    />
                                                )}
                                                {/* 1st place */}
                                                {top3.length >= 1 && (
                                                    <PodiumCard
                                                        entry={top3[0]}
                                                        position={1}
                                                        isCurrentUser={top3[0].odId === currentOdId}
                                                        RS={RS}
                                                        tabType={activeTab}
                                                    />
                                                )}
                                                {/* 3rd place */}
                                                {top3.length >= 3 && (
                                                    <PodiumCard
                                                        entry={top3[2]}
                                                        position={3}
                                                        isCurrentUser={top3[2].odId === currentOdId}
                                                        RS={RS}
                                                        tabType={activeTab}
                                                    />
                                                )}
                                            </View>
                                        )}

                                        {/* Divider */}
                                        {rest.length > 0 && <View style={styles.divider} />}
                                    </>
                                }
                            />
                        )}
                    </View>
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
};

// ═══════════════════════════════════════════════════════
//                      STYLES
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
    flex: { flex: 1 },

    // ── Header ──
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
    },
    circleBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontWeight: '900',
        color: '#fff',
    },

    // ── Tabs ──
    tabRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.07)',
    },
    tabActive: {
        backgroundColor: '#7c3aed',
    },
    tabLabel: {
        fontWeight: '700',
        color: 'rgba(255,255,255,0.55)',
    },
    tabLabelActive: {
        color: '#fff',
    },

    // ── Rank Banner ──
    rankBanner: {
        marginBottom: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        backgroundColor: 'rgba(139,92,246,0.15)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(139,92,246,0.25)',
    },
    rankBannerText: {
        textAlign: 'center',
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
    },
    rankBannerNum: {
        fontWeight: '900',
        fontSize: 16,
    },
    rankBannerTitle: {
        fontWeight: '800',
        fontSize: 14,
    },

    // ── Podium ──
    podiumRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 12,
        paddingTop: 4,
    },
    podiumCard: {
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 6,
    },
    podiumIconWrap: {
        marginBottom: 4,
    },
    podiumBadge: {
        marginBottom: 2,
    },
    podiumName: {
        fontWeight: '800',
        textAlign: 'center',
    },
    podiumRankTitle: {
        fontSize: 11,
        fontWeight: '700',
        marginTop: 1,
    },
    podiumSpecialTitle: {
        marginTop: 1,
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.78)',
        textAlign: 'center',
    },
    podiumScore: {
        fontWeight: '800',
        color: 'rgba(255,255,255,0.85)',
        marginTop: 4,
    },

    // ── Divider ──
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.08)',
        marginVertical: 10,
        marginHorizontal: 4,
    },

    // ── List Item ──
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        marginBottom: 6,
    },
    listItemCurrent: {
        borderWidth: 1.5,
        borderColor: '#8b5cf6',
    },
    posCol: {
        width: 32,
        alignItems: 'center',
    },
    posText: {
        fontWeight: '800',
        color: 'rgba(255,255,255,0.45)',
    },
    userCol: {
        flex: 1,
        marginLeft: 8,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    badgeText: {
        fontSize: 14,
    },
    nameText: {
        fontWeight: '700',
        color: '#fff',
        flexShrink: 1,
    },
    rankLabel: {
        fontSize: 11,
        fontWeight: '700',
        marginTop: 1,
    },
    scoreCol: {
        alignItems: 'flex-end',
        minWidth: 60,
    },
    scoreText: {
        fontWeight: '800',
        color: '#fff',
    },
    scoreUnit: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.4)',
        fontWeight: '600',
    },

    // ── Center States ──
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingLabel: {
        marginTop: 12,
        color: 'rgba(255,255,255,0.55)',
        fontSize: 15,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#fff',
        marginTop: 16,
    },
    emptySub: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.45)',
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 32,
    },
});

// ─── Score Formula Panel Styles ───────────────────────
const leaderStyles = StyleSheet.create({
    formulaPanel: {
        marginBottom: 12,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(139,92,246,0.2)',
        overflow: 'hidden',
    },
    formulaTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 10,
    },
    formulaGrid: {
        gap: 6,
    },
    formulaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 3,
    },
    formulaEmoji: {
        fontSize: 16,
        width: 24,
        textAlign: 'center',
    },
    formulaLabel: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.75)',
    },
    formulaMultiplierBadge: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 8,
        minWidth: 44,
        alignItems: 'center',
    },
    formulaMultiplier: {
        fontSize: 13,
        fontWeight: '900',
    },
    formulaNote: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.35)',
        textAlign: 'center',
        marginTop: 10,
        fontStyle: 'italic',
    },
});

export default LeaderboardScreen;
