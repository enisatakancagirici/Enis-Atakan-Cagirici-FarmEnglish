/**
 * ⚔️ BattleLoadingScreen — Şaşalı Karşılaşma Yüklenme Ekranı
 *
 * Özellikler:
 * - "ENIS vs BİRKAY" animasyonlu VS gösterimi
 * - Her iki oyuncunun rütbe ismi ve simgesi
 * - Ünvanı varsa (Top 5) özel ünvan rozeti
 * - Rakip statları (galibiyet, seri, seviye)
 * - İpucu kutusu (rastgele)
 * - Parlayan gradient arkaplan & animasyonlar
 */

import React, { useEffect, useRef, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Swords, Shield, Trophy, Flame, Zap, Crown, Star } from 'lucide-react-native';
import {
  getMilitaryRank,
  getRandomBattleTip,
  type PlayerTitle,
} from '../utils/titleSystem';
import { haptic } from '../utils/sound';
import { normalizeDisplayText } from '../utils/textNormalization';

const { width: SW, height: SH } = Dimensions.get('window');
const IS_SMALL = SH < 700;

// ─────────────────────────────────────────
// 📦 PROPS
// ─────────────────────────────────────────

interface BattleLoadingScreenProps {
  /** Mevcut oyuncunun adı */
  myNickname: string;
  /** Rakibin adı (bulunduysa) */
  opponentNickname?: string | null;
  /** Kendi leaderboard sıram (opsiyonel - ünvan için) */
  myRank?: number;
  /** Rakibin leaderboard sırası (opsiyonel) */
  opponentRank?: number;
  /** Rakibin galibiyetleri */
  opponentWins?: number;
  /** Rakibin kayıpları */
  opponentLosses?: number;
  /** Rakibin en iyi serisi */
  opponentBestStreak?: number;
  /** Rakibin seviyesi */
  opponentLevel?: number;
  /** Kendi statlarım */
  myWins?: number;
  myLosses?: number;
  myBestStreak?: number;
  myLevel?: number;
  /** Kendi ünvanım (top 5'teyse) */
  myTitle?: PlayerTitle | null;
  /** Rakibin ünvanı (top 5'teyse) */
  opponentTitle?: PlayerTitle | null;
  /** Durum: aranıyor mu, bulundu mu */
  status: 'searching' | 'matched' | 'countdown';
  /** Geri sayım sayısı (3, 2, 1, SAVAŞ!) */
  countdown?: number;
  /** İptal fonksiyonu */
  onCancel?: () => void;
}

// ─────────────────────────────────────────
// 🏅 PLAYER CARD (Sol ve Sağ)
// ─────────────────────────────────────────

const PlayerCard = memo<{
  nickname: string;
  rank?: number;
  wins?: number;
  losses?: number;
  bestStreak?: number;
  level?: number;
  title?: PlayerTitle | null;
  side: 'left' | 'right';
  slideAnim: Animated.Value;
  fadeAnim: Animated.Value;
  duelAnim: Animated.Value;
}>(({ nickname, rank, wins, losses, bestStreak, level, title, side, slideAnim, fadeAnim, duelAnim }) => {
  const militaryRank = getMilitaryRank(rank || 999);
  const isLeft = side === 'left';
  const safeNickname = normalizeDisplayText(nickname) || '???';
  const safeRankTitle = normalizeDisplayText(militaryRank.title);
  const safeTitle = title ? normalizeDisplayText(title.title) : '';

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [isLeft ? -SW : SW, 0],
  });

  const duelShift = duelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, isLeft ? (IS_SMALL ? 18 : 24) : (IS_SMALL ? -18 : -24)],
  });

  const duelScale = duelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.07],
  });

  return (
    <Animated.View
      style={[
        styles.playerCard,
        isLeft ? styles.playerCardLeft : styles.playerCardRight,
        {
          opacity: fadeAnim,
          transform: [{ translateX: Animated.add(translateX, duelShift) }, { scale: duelScale }],
        },
      ]}
    >
      {/* Rütbe rozeti */}
      <View style={[styles.rankBadge, { borderColor: militaryRank.color }]}>
        <Text style={styles.rankBadgeText}>{militaryRank.badge}</Text>
      </View>

      {/* İsim */}
      <Text
        style={[styles.playerName, { textAlign: isLeft ? 'left' : 'right' }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {safeNickname}
      </Text>

      {/* Rütbe ismi */}
      <Text style={[styles.rankTitle, { color: militaryRank.color, textAlign: isLeft ? 'left' : 'right' }]}>
        {safeRankTitle}
      </Text>

      {/* Ünvan (Top 5 ise) */}
      {title && (
        <View style={[styles.titleBadge, { backgroundColor: `${title.color}20`, borderColor: `${title.color}60` }]}>
          <Text style={styles.titleEmoji}>{title.emoji}</Text>
          <Text style={[styles.titleText, { color: title.color }]}>{safeTitle}</Text>
        </View>
      )}

      {/* Statlar */}
      <View style={[styles.statsRow, { justifyContent: isLeft ? 'flex-start' : 'flex-end' }]}>
        {level != null && (
          <View style={styles.statItem}>
            <Star size={12} color="#fbbf24" />
            <Text style={styles.statText}>Lv.{level}</Text>
          </View>
        )}
        {wins != null && (
          <View style={styles.statItem}>
            <Trophy size={12} color="#22c55e" />
            <Text style={styles.statText}>{wins}</Text>
          </View>
        )}
        {bestStreak != null && bestStreak > 0 && (
          <View style={styles.statItem}>
            <Flame size={12} color="#f97316" />
            <Text style={styles.statText}>{bestStreak}</Text>
          </View>
        )}
      </View>

      {/* Kazanma oranı */}
      {wins != null && losses != null && (wins + losses) > 0 && (
        <Text style={[styles.winRate, { textAlign: isLeft ? 'left' : 'right' }]}>
          {'%' + Math.round((wins / (wins + losses)) * 100) + ' galibiyet'}
        </Text>
      )}
    </Animated.View>
  );
});
PlayerCard.displayName = 'PlayerCard';

// ─────────────────────────────────────────
// ⚔️ VS BADGE (Ortadaki Animasyonlu Simge)
// ─────────────────────────────────────────

const VSBadge = memo<{ scaleAnim: Animated.Value; rotateAnim: Animated.Value; glowAnim: Animated.Value }>(
  ({ scaleAnim, rotateAnim, glowAnim }) => {
    const rotate = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <View style={styles.vsContainer}>
        {/* Glow efekti */}
        <Animated.View
          style={[
            styles.vsGlow,
            {
              opacity: glowAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        />
        {/* Dönen arka çember */}
        <Animated.View
          style={[
            styles.vsRing,
            { transform: [{ rotate }, { scale: scaleAnim }] },
          ]}
        >
          <LinearGradient
            colors={['#8b5cf6', '#ec4899', '#f97316', '#8b5cf6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.vsRingGradient}
          />
        </Animated.View>
        {/* VS yazısı */}
        <Animated.View style={[styles.vsBadge, { transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient
            colors={['#1a1b2e', '#2d1b4e']}
            style={styles.vsBadgeInner}
          >
            <Swords size={IS_SMALL ? 28 : 36} color="#fff" strokeWidth={2.5} />
            <Text style={styles.vsText}>VS</Text>
          </LinearGradient>
        </Animated.View>
      </View>
    );
  }
);
VSBadge.displayName = 'VSBadge';

// ─────────────────────────────────────────
// 🎮 ANA BİLEŞEN
// ─────────────────────────────────────────

export const BattleLoadingScreen: React.FC<BattleLoadingScreenProps> = memo(({
  myNickname,
  opponentNickname,
  myRank,
  opponentRank,
  opponentWins,
  opponentLosses,
  opponentBestStreak,
  opponentLevel,
  myWins,
  myLosses,
  myBestStreak,
  myLevel,
  myTitle,
  opponentTitle,
  status,
  countdown,
  onCancel,
}) => {
  // ─── ANİMASYONLAR ──────────────────────────────
  const leftSlideAnim = useRef(new Animated.Value(0)).current;
  const rightSlideAnim = useRef(new Animated.Value(0)).current;
  const leftFadeAnim = useRef(new Animated.Value(0)).current;
  const rightFadeAnim = useRef(new Animated.Value(0)).current;
  const vsScaleAnim = useRef(new Animated.Value(0)).current;
  const vsRotateAnim = useRef(new Animated.Value(0)).current;
  const vsGlowAnim = useRef(new Animated.Value(0)).current;
  const tipFadeAnim = useRef(new Animated.Value(0)).current;
  const countdownScaleAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(-1)).current;
  const searchPulseAnim = useRef(new Animated.Value(1)).current;
  const duelChargeAnim = useRef(new Animated.Value(0)).current;
  const battleStartTextAnim = useRef(new Animated.Value(0)).current;
  const introHapticPlayedRef = useRef(false);

  const tip = useMemo(() => normalizeDisplayText(getRandomBattleTip()), []);
  const headerLabel =
    status === 'searching'
      ? '⚔️ Savaşçı Aranıyor...'
      : status === 'countdown'
        ? '🔥 HAZIR OL!'
        : '⚔️ Rakip Bulundu!';

  // ─── ARAMA ANİMASYONU ──────────────────────────
  useEffect(() => {
    // Background shimmer
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Arama pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(searchPulseAnim, {
          toValue: 1.15,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(searchPulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Sol oyuncu kartı her zaman göster
    Animated.parallel([
      Animated.spring(leftSlideAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
        delay: 200,
      }),
      Animated.timing(leftFadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // İpucu fade in
    Animated.timing(tipFadeAnim, {
      toValue: 1,
      duration: 600,
      delay: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // ─── RAKİP BULUNDU ANİMASYONU ──────────────────
  useEffect(() => {
    if (status === 'matched' || status === 'countdown') {
      // Sağ oyuncu kartı giriş
      Animated.parallel([
        Animated.spring(rightSlideAnim, {
          toValue: 1,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(rightFadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      // VS badge büyüme
      Animated.sequence([
        Animated.delay(300),
        Animated.spring(vsScaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();

      // VS glow pulse (loop)
      Animated.loop(
        Animated.sequence([
          Animated.timing(vsGlowAnim, {
            toValue: 0.8,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(vsGlowAnim, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // VS ring rotation (loop)
      Animated.loop(
        Animated.timing(vsRotateAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      duelChargeAnim.setValue(0);
      Animated.spring(duelChargeAnim, {
        toValue: 1,
        friction: 6,
        tension: 65,
        useNativeDriver: true,
      }).start();

      battleStartTextAnim.setValue(0);
      Animated.sequence([
        Animated.timing(battleStartTextAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.delay(700),
        Animated.timing(battleStartTextAnim, {
          toValue: 0.85,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();

      if (!introHapticPlayedRef.current) {
        introHapticPlayedRef.current = true;
        haptic.heavy();
        setTimeout(() => haptic.rigid(), 45);
        setTimeout(() => haptic.success(), 120);
      }
    } else {
      introHapticPlayedRef.current = false;
      duelChargeAnim.setValue(0);
      battleStartTextAnim.setValue(0);
    }
  }, [status, duelChargeAnim, battleStartTextAnim]);

  // ─── GERİ SAYIM ANİMASYONU ─────────────────────
  useEffect(() => {
    if (countdown != null) {
      countdownScaleAnim.setValue(0);
      Animated.sequence([
        Animated.spring(countdownScaleAnim, {
          toValue: 1.2,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(countdownScaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [countdown]);

  // ─── SHIMMER TRANSLATE ──────────────────────────
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-SW * 2, SW * 2],
  });

  // ─────────────────────────────────────────
  // 🖥️ RENDER
  // ─────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Arka plan gradient */}
      <LinearGradient
        colors={['#0a0b1a', '#1a0a2e', '#2d0a3e', '#1a0a2e', '#0a0b1a']}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Shimmer overlay */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shimmer,
          { transform: [{ translateX: shimmerTranslate }] },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(139,92,246,0.06)', 'rgba(236,72,153,0.08)', 'rgba(139,92,246,0.06)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Başlık */}
      <View style={styles.header}>
        <Animated.View style={{ transform: [{ scale: searchPulseAnim }] }}>
          <Shield size={IS_SMALL ? 20 : 24} color="#8b5cf6" strokeWidth={2} />
        </Animated.View>
        <Text style={styles.headerTitle}>
          {headerLabel}
        </Text>
      </View>

      {/* Oyuncu Kartları + VS */}
      {(status === 'matched' || status === 'countdown') && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.battleStartBanner,
            {
              opacity: battleStartTextAnim,
              transform: [
                {
                  scale: battleStartTextAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.84, 1.04],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(239,68,68,0.2)', 'rgba(245,158,11,0.26)', 'rgba(239,68,68,0.22)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.battleStartBannerGradient}
          >
            <Text style={styles.battleStartBannerTitle}>SAVAŞ BAŞLIYOR</Text>
            <Text style={styles.battleStartBannerSubtitle}>Hazır ol, güçlü bir başlangıç geliyor</Text>
          </LinearGradient>
        </Animated.View>
      )}

      <View style={styles.battleField}>
        {/* Sol: Ben */}
        <PlayerCard
          nickname={myNickname}
          rank={myRank}
          wins={myWins}
          losses={myLosses}
          bestStreak={myBestStreak}
          level={myLevel}
          title={myTitle}
          side="left"
          slideAnim={leftSlideAnim}
          fadeAnim={leftFadeAnim}
          duelAnim={duelChargeAnim}
        />

        {/* Orta: VS Badge */}
        {(status === 'matched' || status === 'countdown') ? (
          <VSBadge
            scaleAnim={vsScaleAnim}
            rotateAnim={vsRotateAnim}
            glowAnim={vsGlowAnim}
          />
        ) : (
          <View style={styles.searchingVsContainer}>
            <Animated.View style={{ transform: [{ scale: searchPulseAnim }] }}>
              <Swords size={IS_SMALL ? 36 : 48} color="#8b5cf680" strokeWidth={1.5} />
            </Animated.View>
            <ActivityIndicator size="small" color="#8b5cf6" style={{ marginTop: 8 }} />
          </View>
        )}

        {/* Sağ: Rakip */}
        {(status === 'matched' || status === 'countdown') ? (
          <PlayerCard
            nickname={opponentNickname || '???'}
            rank={opponentRank}
            wins={opponentWins}
            losses={opponentLosses}
            bestStreak={opponentBestStreak}
            level={opponentLevel}
            title={opponentTitle}
            side="right"
            slideAnim={rightSlideAnim}
            fadeAnim={rightFadeAnim}
            duelAnim={duelChargeAnim}
          />
        ) : (
          <Animated.View style={[styles.playerCard, styles.playerCardRight, { opacity: 0.3 }]}>
            <View style={[styles.rankBadge, { borderColor: '#475569' }]}>
              <Text style={styles.rankBadgeText}>❓</Text>
            </View>
            <Text style={[styles.playerName, { textAlign: 'right', color: '#64748b' }]}>???</Text>
            <Text style={[styles.rankTitle, { color: '#475569', textAlign: 'right' }]}>Aranıyor...</Text>
          </Animated.View>
        )}
      </View>

      {/* Geri Sayım */}
      {status === 'countdown' && countdown != null && (
        <Animated.View style={[styles.countdownContainer, { transform: [{ scale: countdownScaleAnim }] }]}>
          <LinearGradient
            colors={countdown === 0 ? ['#22c55e', '#16a34a'] : ['#8b5cf6', '#6d28d9']}
            style={styles.countdownBadge}
          >
            <Text style={styles.countdownText}>
              {countdown === 0 ? 'SAVAŞ!' : countdown}
            </Text>
          </LinearGradient>
        </Animated.View>
      )}

      {/* Savaşçı Sıralaması Bilgisi */}
      {(myRank != null && myRank <= 200) && (
        <View style={styles.rankInfoContainer}>
          <Crown size={14} color="#fbbf24" />
          <Text style={styles.rankInfoText}>
            Savaşçı Sıralaması: #{myRank}
          </Text>
        </View>
      )}

      {/* İpucu Kutusu */}
      <Animated.View style={[styles.tipContainer, { opacity: tipFadeAnim }]}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.12)', 'rgba(236, 72, 153, 0.08)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.tipGradient}
        >
          <Zap size={16} color="#a78bfa" strokeWidth={2} />
          <Text style={styles.tipText}>{tip}</Text>
        </LinearGradient>
      </Animated.View>

      {/* İptal Butonu (sadece aranırken) */}
      {status === 'searching' && onCancel && (
        <Animated.View style={[styles.cancelContainer, { opacity: tipFadeAnim }]}>
          <Animated.View style={styles.cancelButton}>
            <Text style={styles.cancelText} onPress={onCancel}>İptal</Text>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
});
BattleLoadingScreen.displayName = 'BattleLoadingScreen';

// ─────────────────────────────────────────
// 🎨 STİLLER
// ─────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    width: SW * 3,
  },

  // Header
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: IS_SMALL ? 16 : 18,
    fontWeight: '800',
    color: '#e2e8f0',
    letterSpacing: 0.5,
  },
  battleStartBanner: {
    marginBottom: IS_SMALL ? 12 : 16,
    width: SW - 36,
    maxWidth: 420,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  battleStartBannerGradient: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  battleStartBannerTitle: {
    color: '#fef3c7',
    fontWeight: '900',
    letterSpacing: 1,
    fontSize: IS_SMALL ? 14 : 16,
  },
  battleStartBannerSubtitle: {
    color: '#fde68a',
    marginTop: 2,
    fontWeight: '600',
    fontSize: IS_SMALL ? 10 : 11,
  },

  // Battle Field (Oyuncular + VS)
  battleField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: SW - 24,
    maxWidth: 500,
    paddingHorizontal: 4,
  },

  // Player Card
  playerCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: IS_SMALL ? 12 : 16,
    paddingHorizontal: IS_SMALL ? 8 : 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    minHeight: IS_SMALL ? 160 : 190,
    justifyContent: 'center',
  },
  playerCardLeft: {
    marginRight: 4,
  },
  playerCardRight: {
    marginLeft: 4,
  },

  // Rank Badge (Askeri rütbe rozeti)
  rankBadge: {
    width: IS_SMALL ? 44 : 52,
    height: IS_SMALL ? 44 : 52,
    borderRadius: IS_SMALL ? 22 : 26,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  rankBadgeText: {
    fontSize: IS_SMALL ? 18 : 22,
  },

  // Player Name
  playerName: {
    fontSize: IS_SMALL ? 14 : 16,
    fontWeight: '800',
    color: '#f1f5f9',
    letterSpacing: 0.3,
    marginBottom: 2,
  },

  // Rütbe İsmi
  rankTitle: {
    fontSize: IS_SMALL ? 11 : 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },

  // Ünvan Rozeti (Top 5)
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  titleEmoji: {
    fontSize: IS_SMALL ? 11 : 13,
  },
  titleText: {
    fontSize: IS_SMALL ? 9 : 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statText: {
    fontSize: IS_SMALL ? 10 : 11,
    fontWeight: '700',
    color: '#94a3b8',
  },

  // Win Rate
  winRate: {
    fontSize: IS_SMALL ? 9 : 10,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 4,
  },

  // VS Container
  vsContainer: {
    width: IS_SMALL ? 60 : 72,
    height: IS_SMALL ? 60 : 72,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  vsGlow: {
    position: 'absolute',
    width: IS_SMALL ? 80 : 100,
    height: IS_SMALL ? 80 : 100,
    borderRadius: IS_SMALL ? 40 : 50,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  vsRing: {
    position: 'absolute',
    width: IS_SMALL ? 58 : 70,
    height: IS_SMALL ? 58 : 70,
    borderRadius: IS_SMALL ? 29 : 35,
    overflow: 'hidden',
  },
  vsRingGradient: {
    flex: 1,
  },
  vsBadge: {
    width: IS_SMALL ? 50 : 60,
    height: IS_SMALL ? 50 : 60,
    borderRadius: IS_SMALL ? 25 : 30,
    overflow: 'hidden',
  },
  vsBadgeInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vsText: {
    fontSize: IS_SMALL ? 10 : 12,
    fontWeight: '900',
    color: '#a78bfa',
    letterSpacing: 2,
    marginTop: -2,
  },

  // Searching VS
  searchingVsContainer: {
    width: IS_SMALL ? 60 : 72,
    height: IS_SMALL ? 60 : 72,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },

  // Countdown
  countdownContainer: {
    marginTop: IS_SMALL ? 16 : 24,
  },
  countdownBadge: {
    width: IS_SMALL ? 72 : 88,
    height: IS_SMALL ? 72 : 88,
    borderRadius: IS_SMALL ? 36 : 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  countdownText: {
    fontSize: IS_SMALL ? 28 : 36,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },

  // Rank Info
  rankInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: IS_SMALL ? 12 : 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  rankInfoText: {
    fontSize: IS_SMALL ? 11 : 12,
    fontWeight: '700',
    color: '#fbbf24',
    letterSpacing: 0.3,
  },

  // Tip Container
  tipContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 120 : 100,
    left: 20,
    right: 20,
    maxWidth: 440,
    alignSelf: 'center',
  },
  tipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  tipText: {
    flex: 1,
    fontSize: IS_SMALL ? 12 : 13,
    fontWeight: '600',
    color: '#cbd5e1',
    lineHeight: IS_SMALL ? 17 : 19,
  },

  // Cancel
  cancelContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 200 : 180,
  },
  cancelButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ef4444',
  },
});

export default BattleLoadingScreen;
