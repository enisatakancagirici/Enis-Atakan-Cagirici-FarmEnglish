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

// â”€â”€â”€ Responsive â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

const LEADER_THEME = {
    screenGradient: ['#04070d', '#111827', '#1f2937'] as const,
    panel: 'rgba(8, 12, 22, 0.86)',
    panelBorder: 'rgba(248, 113, 113, 0.24)',
    panelSoft: 'rgba(15, 23, 42, 0.75)',
    tabIdle: 'rgba(15, 23, 42, 0.82)',
    tabActive: '#9f1239',
    textMain: '#f8fafc',
    textMuted: 'rgba(203, 213, 225, 0.72)',
    accent: '#fb7185',
    cta: '#fdba74',
};

// â”€â”€â”€ Askeri Rütbe Sistemi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface MilitaryRank {
    title: string;
    badge: string;
    color: string;
    glow: string;
}

function getMilitaryRank(position: number): MilitaryRank {
    if (position === 1)
        return { title: 'Mareşal', badge: '🏅', color: '#ffd700', glow: 'rgba(255,215,0,0.3)' };
    if (position === 2)
        return { title: 'Orgeneral', badge: '⭐⭐⭐⭐', color: '#e5e7eb', glow: 'rgba(229,231,235,0.2)' };
    if (position === 3)
        return { title: 'Korgeneral', badge: '⭐⭐⭐', color: '#cd7f32', glow: 'rgba(205,127,50,0.2)' };
    if (position <= 5)
        return { title: 'Tümgeneral', badge: '⭐⭐', color: '#a78bfa', glow: 'rgba(167,139,250,0.15)' };
    if (position <= 10)
        return { title: 'Tuğgeneral', badge: '⭐', color: '#818cf8', glow: 'rgba(129,140,248,0.12)' };
    if (position <= 15)
        return { title: 'Albay', badge: '🎯', color: '#60a5fa', glow: 'rgba(96,165,250,0.1)' };
    if (position <= 25)
        return { title: 'Yarbay', badge: '🛡️', color: '#34d399', glow: 'rgba(52,211,153,0.1)' };
    if (position <= 35)
        return { title: 'Binbaşı', badge: 'âš”️', color: '#fbbf24', glow: 'rgba(251,191,36,0.08)' };
    if (position <= 50)
        return { title: 'Yüzbaşı', badge: '🗡️', color: '#f97316', glow: 'rgba(249,115,22,0.08)' };
    if (position <= 75)
        return { title: 'Üsteğmen', badge: '📰', color: '#94a3b8', glow: 'rgba(148,163,184,0.06)' };
    if (position <= 100)
        return { title: 'Teğmen', badge: '📌', color: '#94a3b8', glow: 'rgba(148,163,184,0.05)' };
    if (position <= 200)
        return { title: 'Asteğmen', badge: '📹', color: '#64748b', glow: 'rgba(100,116,139,0.04)' };
    return { title: 'Er', badge: '📸', color: '#475569', glow: 'rgba(71,85,105,0.03)' };
}

// â”€â”€â”€ Tab Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Tab Button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Top-3 Podium Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                        // 2. ve 3. daha aşağıda â€” marginTop ile
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
                    isCurrentUser && { borderColor: LEADER_THEME.accent, borderWidth: 2.5 },
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

                {/* Crown / Medal â€” Mareşal için çift taç */}
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

                {/* Badge + rank title â€” Mareşal için büyük badge */}
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

                {/* Military rank â€” Mareşal daha büyük */}
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

                {/* Score â€” Mareşal daha görkemli */}
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

// â”€â”€â”€ Regular List Item â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                                isCurrentUser && { color: LEADER_THEME.accent },
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

// â”€â”€â”€ Score Display Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getNumericScore(entry: LeaderboardEntry, tabType: TabType): number {
    if (tabType === 'general') return entry.generalScore ?? computeGeneralScore(entry);
    if (tabType === 'battle') return entry.wins || 0;
    if (tabType === 'harvest') return entry.harvestCount || 0;
    return 0;
}

function getDisplayScore(entry: LeaderboardEntry, tabType: TabType): string {
    return getNumericScore(entry, tabType).toLocaleString('tr-TR');
}

// â”€â”€â”€ Score Formula Explanation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SCORE_FORMULA_ITEMS = [
    { emoji: 'âš”️', label: 'Savaş Galibiyeti', multiplier: '×50', color: '#ef4444' },
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
                colors={['rgba(127,29,29,0.26)', 'rgba(124,45,18,0.2)']}
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//                   MAIN COMPONENT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

    // â”€â”€ Load â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ Real-time listener â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ Refresh â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        haptic.light();
        await load();
        setRefreshing(false);
    }, [load]);

    // â”€â”€ Current user rank â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const currentUserIdx = leaderboard.findIndex((e) => e.odId === currentOdId);
    const currentUserRank = currentUserIdx >= 0 ? currentUserIdx + 1 : -1;
    const currentMilRank = currentUserRank > 0 ? getMilitaryRank(currentUserRank) : null;
    const currentSpecialTitle = currentUserRank > 0 ? getSpecialTitle(activeTab, currentUserRank) : null;

    // â”€â”€ Top 3 & rest â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const top3 = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3);
    const topEntry = leaderboard[0];
    const currentEntry = currentUserIdx >= 0 ? leaderboard[currentUserIdx] : null;
    const topMetric = topEntry ? getNumericScore(topEntry, activeTab) : 0;
    const currentMetric = currentEntry ? getNumericScore(currentEntry, activeTab) : 0;
    const chaseGap = Math.max(0, topMetric - currentMetric);

    // â”€â”€ Renderers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ Tab title helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const headerLabel =
        activeTab === 'general'
            ? 'Genel Sıralama'
            : activeTab === 'battle'
              ? 'Savaşçılar'
              : 'Çiftçiler';

    return (
        <LinearGradient colors={LEADER_THEME.screenGradient} style={styles.flex}>
            <SafeAreaView style={styles.flex}>
                {/* â”€â”€ Header â”€â”€ */}
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
                        <Shield color={LEADER_THEME.accent} size={RS.icon} />
                        <Text style={[styles.headerTitle, { fontSize: RS.title }]}>{headerLabel}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable style={styles.circleBtn} onPress={() => { haptic.light(); setShowFormula(!showFormula); }}>
                            <Info color={showFormula ? LEADER_THEME.accent : '#fff'} size={18} />
                        </Pressable>
                        <Pressable style={styles.circleBtn} onPress={handleRefresh}>
                            <RefreshCw color="#fff" size={18} />
                        </Pressable>
                    </View>
                </View>

                {/* â”€â”€ Content â”€â”€ */}
                <View style={[styles.flex, { paddingHorizontal: RS.pad }]}>
                    <View style={contentStyle}>
                        {/* â”€â”€ Tabs â”€â”€ */}
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

                        {/* â”€â”€ Score Formula Panel â”€â”€ */}
                        <View style={styles.seasonPulse}>
                            <Text style={styles.seasonPulseTitle}>Sezon Nabzı</Text>
                            <View style={styles.seasonPulseRow}>
                                <View style={styles.seasonStat}>
                                    <Text style={styles.seasonStatLabel}>Lider</Text>
                                    <Text style={styles.seasonStatValue} numberOfLines={1}>
                                        {topEntry?.nickname || '-'}
                                    </Text>
                                </View>
                                <View style={styles.seasonStat}>
                                    <Text style={styles.seasonStatLabel}>Skor</Text>
                                    <Text style={styles.seasonStatValue}>{topMetric.toLocaleString('tr-TR')}</Text>
                                </View>
                                <View style={styles.seasonStat}>
                                    <Text style={styles.seasonStatLabel}>Fark</Text>
                                    <Text style={[styles.seasonStatValue, chaseGap > 0 && styles.seasonGapWarn]}>
                                        {currentUserRank > 0 ? chaseGap.toLocaleString('tr-TR') : '--'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {activeTab === 'general' && <ScoreFormulaPanel visible={showFormula} RS={RS} />}

                        {/* â”€â”€ Current User Rank Banner â”€â”€ */}
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

                        {/* â”€â”€ Loading / Empty / List â”€â”€ */}
                        {loading ? (
                            <View style={styles.center}>
                                <ActivityIndicator size="large" color={LEADER_THEME.accent} />
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
                                        tintColor={LEADER_THEME.accent}
                                    />
                                }
                                ListHeaderComponent={
                                    <>
                                        {/* â”€â”€ Top 3 Podium â”€â”€ */}
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//                      STYLES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const styles = StyleSheet.create({
    flex: { flex: 1 },
    // â”€â”€ Header â”€â”€
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
        backgroundColor: LEADER_THEME.panelSoft,
        borderWidth: 1,
        borderColor: LEADER_THEME.panelBorder,
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
        color: LEADER_THEME.textMain,
        textShadowColor: 'rgba(251, 113, 133, 0.35)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    },

    // â”€â”€ Tabs â”€â”€
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
        backgroundColor: LEADER_THEME.tabIdle,
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.22)',
    },
    tabActive: {
        backgroundColor: LEADER_THEME.tabActive,
        borderColor: 'rgba(251, 113, 133, 0.44)',
    },
    tabLabel: {
        fontWeight: '700',
        color: LEADER_THEME.textMuted,
    },
    tabLabelActive: {
        color: LEADER_THEME.textMain,
    },

    // â”€â”€ Rank Banner â”€â”€
    rankBanner: {
        marginBottom: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        backgroundColor: LEADER_THEME.panel,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: LEADER_THEME.panelBorder,
    },
    rankBannerText: {
        textAlign: 'center',
        color: LEADER_THEME.textMuted,
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

    // â”€â”€ Podium â”€â”€
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

    // â”€â”€ Divider â”€â”€
    divider: {
        height: 1,
        backgroundColor: 'rgba(248, 113, 113, 0.22)',
        marginVertical: 10,
        marginHorizontal: 4,
    },

    // â”€â”€ List Item â”€â”€
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.16)',
        backgroundColor: LEADER_THEME.panelSoft,
    },
    listItemCurrent: {
        borderWidth: 1.5,
        borderColor: LEADER_THEME.accent,
        shadowColor: LEADER_THEME.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.24,
        shadowRadius: 10,
    },
    posCol: {
        width: 32,
        alignItems: 'center',
    },
    posText: {
        fontWeight: '800',
        color: 'rgba(203, 213, 225, 0.56)',
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
        color: LEADER_THEME.textMain,
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
        color: LEADER_THEME.textMain,
    },
    scoreUnit: {
        fontSize: 10,
        color: 'rgba(203, 213, 225, 0.5)',
        fontWeight: '600',
    },
    seasonPulse: {
        marginBottom: 12,
        borderRadius: 14,
        padding: 12,
        backgroundColor: LEADER_THEME.panel,
        borderWidth: 1,
        borderColor: LEADER_THEME.panelBorder,
    },
    seasonPulseTitle: {
        color: LEADER_THEME.textMain,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.4,
        marginBottom: 8,
    },
    seasonPulseRow: {
        flexDirection: 'row',
        gap: 8,
    },
    seasonStat: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.62)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.22)',
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    seasonStatLabel: {
        color: 'rgba(203, 213, 225, 0.68)',
        fontSize: 10,
        fontWeight: '700',
    },
    seasonStatValue: {
        marginTop: 2,
        color: LEADER_THEME.textMain,
        fontSize: 13,
        fontWeight: '800',
    },
    seasonGapWarn: {
        color: LEADER_THEME.cta,
    },

    // â”€â”€ Center States â”€â”€
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingLabel: {
        marginTop: 12,
        color: LEADER_THEME.textMuted,
        fontSize: 15,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: LEADER_THEME.textMain,
        marginTop: 16,
    },
    emptySub: {
        fontSize: 14,
        color: LEADER_THEME.textMuted,
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 32,
    },
});

// â”€â”€â”€ Score Formula Panel Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const leaderStyles = StyleSheet.create({
    formulaPanel: {
        marginBottom: 12,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(248, 113, 113, 0.28)',
        overflow: 'hidden',
    },
    formulaTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: LEADER_THEME.textMain,
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
        color: LEADER_THEME.textMuted,
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
        color: 'rgba(203, 213, 225, 0.52)',
        textAlign: 'center',
        marginTop: 10,
        fontStyle: 'italic',
    },
});

export default LeaderboardScreen;
