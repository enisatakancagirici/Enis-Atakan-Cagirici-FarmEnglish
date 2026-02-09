import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFarmStore } from '../store/farmStore';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { Play } from 'lucide-react-native';

// Tab tipleri
type TabType = 'daily' | 'weekly' | 'repeatable' | 'story' | 'achievement';

interface DailyQuestsPanelProps {
  onClose?: () => void;
  onNavigate?: (screen: string, params?: any) => void; // Navigation callback from parent with optional params
}

// Quest type → gradient renkleri mapping
const getQuestGradient = (type: string, completed: boolean): [string, string] => {
  if (completed) return ['#4CAF50', '#45a049'];
  
  switch (type) {
    case 'PLANT_WORDS': return ['#E8F5E9', '#C8E6C9'];
    case 'HARVEST_WORDS': return ['#FFF8E1', '#FFECB3'];
    case 'HARVEST_PHRASAL': return ['#E3F2FD', '#BBDEFB'];
    case 'COMPLETE_PUZZLE': return ['#FCE4EC', '#F8BBD9'];
    case 'SPEECH_PRACTICE': return ['#F3E5F5', '#E1BEE7'];
    case 'COMPLETE_QUIZ': return ['#E8EAF6', '#C5CAE9'];
    case 'WIN_BATTLE': return ['#FFEBEE', '#FFCDD2'];
    case 'REACH_COMBO': return ['#FFF3E0', '#FFE0B2'];
    case 'EARN_COINS': return ['#FFFDE7', '#FFF9C4'];
    default: return ['#FFFFFF', '#F5F5F5'];
  }
};

export const DailyQuestsPanel: React.FC<DailyQuestsPanelProps> = ({ onClose, onNavigate }) => {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<TabType>('daily');
  const claimingRef = useRef(new Set<string>());
  
  // Store hooks — sadece data selectors (action'lar için getState() kullanılır)
  const dailyQuests = useFarmStore(state => state.dailyQuests);
  const weeklyQuests = useFarmStore(state => state.weeklyQuests);
  const repeatableQuests = useFarmStore(state => state.repeatableQuests);
  const storyQuests = useFarmStore(state => state.storyQuests);
  const achievementQuests = useFarmStore(state => state.achievementQuests);
  const trophies = useFarmStore(state => state.trophies);

  // 🚀 Performans: Tek action ile tüm görevleri başlat (10 subscription → 0)
  useEffect(() => {
    // Hızlı kontrol — hemen yap
    useFarmStore.getState().checkAndResetDailyQuests();

    // 🔄 Ağır işlemleri UI render'dan sonra yap
    const handle = setTimeout(() => {
      useFarmStore.getState().initializeAllQuests();
    }, 100);

    return () => clearTimeout(handle);
  }, []);

  const handleClaimReward = (questId: string, questType: TabType = 'daily') => {
    // Double-tap guard
    if (claimingRef.current.has(questId)) return;
    claimingRef.current.add(questId);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    useFarmStore.getState().claimQuestReward(questId, questType);
    
    // Tekrarlanabilir görev ise yenisini oluştur
    if (questType === 'repeatable') {
      const quest = repeatableQuests.find(q => q.id === questId);
      if (quest) {
        setTimeout(() => {
          useFarmStore.getState().generateRepeatableQuest(quest.category);
        }, 500);
      }
    }
    
    // Hikaye görevi ise unlock kontrolü yap
    if (questType === 'story') {
      setTimeout(() => {
        useFarmStore.getState().checkStoryQuestUnlocks();
      }, 500);
    }
  };

  // 🎯 Quest'e tıklayınca ilgili ekrana yönlendir
  const handleStartQuest = (quest: any) => {
    if (quest.completed) return; // Tamamlanmış göreve tıklanamaz
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    console.log('🎯 handleStartQuest:', quest.screen, quest.title);
    
    // Modal'ı kapat
    onClose?.();
    
    // Ekrana yönlendir - Puzzle ve PhrasalVerbFarm için Farm screen'e tab parametresiyle yönlendir
    const screenMap: Record<string, { screen: string; params?: any }> = {
      'Quiz': { screen: 'Quiz' },
      'Home': { screen: 'Home' },
      'Farm': { screen: 'Farm' },
      'Puzzle': { screen: 'Farm', params: { tab: 'puzzle' } },
      'PhrasalVerbFarm': { screen: 'Farm', params: { tab: 'phrasal' } },
      'SesYap': { screen: 'SesYap' },
      'Battle': { screen: 'Battle' },
    };
    
    const target = screenMap[quest.screen] || { screen: 'Home' };
    
    console.log('🎯 Navigating to:', target.screen, 'Params:', target.params, 'Has onNavigate:', !!onNavigate);
    
    // Parent callback varsa kullan, yoksa direct navigate
    if (typeof onNavigate === 'function') {
      onNavigate(target.screen, target.params);
    } else {
      setTimeout(() => {
        navigation.navigate(target.screen as any, target.params);
      }, 300);
    }
  };

  // Aktif tab'a göre görevleri al
  const getActiveQuests = (): any[] => {
    switch (activeTab) {
      case 'daily':
        return dailyQuests;
      case 'weekly':
        return weeklyQuests;
      case 'repeatable':
        return repeatableQuests;
      case 'story':
        return storyQuests.filter(q => q.isUnlocked);
      case 'achievement':
        return achievementQuests.filter(q => !q.claimed).slice(0, 8);
      default:
        return dailyQuests;
    }
  };
  
  // ⚡ OPTIMIZE: useMemo ile gereksiz hesaplamaları önle
  const activeQuests = useMemo(() => getActiveQuests(), [activeTab, dailyQuests, weeklyQuests, repeatableQuests, storyQuests, achievementQuests]);
  
  const { completedCount, claimedCount } = useMemo(() => ({
    completedCount: activeQuests.filter(q => q.completed).length,
    claimedCount: activeQuests.filter(q => q.claimed).length,
  }), [activeQuests]);
  
  const allClaimed = useMemo(() => 
    activeTab === 'daily' && dailyQuests.length > 0 && dailyQuests.every(q => q.claimed),
    [activeTab, dailyQuests]
  );

  // 🔒 Guard: Son generate timestamp'i
  const lastGenerateRef = useRef<number>(0);
  
  // Tüm görevler claimed olduysa yeni görevler generate et
  // Not: checkAndResetDailyQuests zaten bu durumu kontrol ediyor,
  // bu effect sadece panel açıkken claim sonrası UI güncellemesi için
  useEffect(() => {
    // Guard: 5 saniye içinde tekrar generate etme
    const now = Date.now();
    if (allClaimed && dailyQuests.length > 0 && (now - lastGenerateRef.current) > 5000) {
      lastGenerateRef.current = now;
      const handle = setTimeout(() => {
        useFarmStore.getState().generateDailyQuests();
      }, 1000);
      return () => clearTimeout(handle);
    }
  }, [allClaimed, dailyQuests.length]);
  
  // ⚡ OPTIMIZE: Tab count'ları useMemo ile hesapla
  const tabs = useMemo(() => [
    { id: 'daily' as TabType, label: 'Günlük', icon: '📋', count: dailyQuests.filter(q => !q.claimed).length },
    { id: 'weekly' as TabType, label: 'Haftalık', icon: '📅', count: weeklyQuests.filter(q => !q.claimed).length },
    { id: 'repeatable' as TabType, label: 'Tekrar', icon: '🔄', count: repeatableQuests.filter(q => !q.claimed).length },
    { id: 'story' as TabType, label: 'Hikaye', icon: '📖', count: storyQuests.filter(q => q.isUnlocked && !q.claimed).length },
    { id: 'achievement' as TabType, label: 'Başarı', icon: '🏆', count: achievementQuests.filter(q => q.completed && !q.claimed).length },
  ], [dailyQuests, weeklyQuests, repeatableQuests, storyQuests, achievementQuests]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#FFD700', '#FFA500']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>🎯 Görevler</Text>
        <View style={styles.trophyContainer}>
          <Text style={styles.trophyIcon}>🏆</Text>
          <Text style={styles.trophyCount}>{trophies}</Text>
        </View>
      </LinearGradient>

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabItem, activeTab === tab.id && styles.tabItemActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab(tab.id);
            }}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{tab.count > 9 ? '9+' : tab.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          {completedCount}/{activeQuests.length} Görev Tamamlandı
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${activeQuests.length > 0 ? (completedCount / activeQuests.length) * 100 : 0}%` }
            ]} 
          />
        </View>
      </View>

      {/* Quest List */}
      <ScrollView style={styles.questList} showsVerticalScrollIndicator={false}>
        {activeQuests.map((quest) => {
          const gradientColors = getQuestGradient(quest.type, quest.completed);
          
          return (
            <TouchableOpacity 
              key={quest.id} 
              style={styles.questCard}
              onPress={() => handleStartQuest(quest)}
              activeOpacity={quest.completed ? 1 : 0.8}
              disabled={quest.completed}
            >
              <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.questGradient}
              >
                {/* Kompakt Quest Row */}
                <View style={styles.questRow}>
                  {/* Sol: Icon + Info */}
                  <View style={styles.questLeft}>
                    <Text style={styles.questIcon}>{quest.icon}</Text>
                    <View style={styles.questInfo}>
                      <Text style={[styles.questTitle, quest.completed && styles.completedText]} numberOfLines={1}>
                        {quest.title}
                      </Text>
                      {/* Açıklama */}
                      <Text style={[styles.questDescription, quest.completed && styles.completedText]}>
                        {quest.description}
                      </Text>
                      {/* Mini Progress */}
                      <View style={styles.miniProgressRow}>
                        <View style={styles.miniProgressBar}>
                          <View 
                            style={[
                              styles.miniProgressFill,
                              { width: `${Math.min((quest.progress / quest.target) * 100, 100)}%` }
                            ]} 
                          />
                        </View>
                        <Text style={[styles.miniProgressText, quest.completed && styles.completedText]}>
                          {quest.progress}/{quest.target}
                        </Text>
                      </View>
                      {/* Hint - tamamlanmamış görevler için */}
                      {!quest.completed && quest.hint && (
                        <Text style={styles.questHint} numberOfLines={1}>
                          💡 {quest.hint}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Sağ: Ödüller + Buton */}
                  <View style={styles.questRight}>
                    {/* Mini Rewards */}
                    <View style={styles.miniRewards}>
                      <Text style={styles.miniRewardText}>🏆{quest.reward.trophy}</Text>
                      <Text style={styles.miniRewardText}>💰{quest.reward.coins}</Text>
                    </View>
                    
                    {/* Action */}
                    {!quest.completed && (
                      <TouchableOpacity 
                        style={styles.miniStartBtn}
                        onPress={() => handleStartQuest(quest)}
                      >
                        <Play size={14} color="#FFF" fill="#FFF" />
                      </TouchableOpacity>
                    )}
                    
                    {quest.completed && !quest.claimed && (
                      <TouchableOpacity 
                        style={styles.miniClaimBtn}
                        onPress={() => handleClaimReward(quest.id, activeTab)}
                      >
                        <Text style={styles.miniClaimText}>Al</Text>
                      </TouchableOpacity>
                    )}
                    
                    {quest.claimed && (
                      <View style={styles.miniDoneIcon}>
                        <Text style={styles.miniDoneText}>✓</Text>
                      </View>
                    )}
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
        
        {/* Boş liste mesajı */}
        {activeQuests.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyText}>Tüm görevler tamamlandı!</Text>
          </View>
        )}
      </ScrollView>

      {/* All Completed Celebration - Sadece daily tab için */}
      {allClaimed && activeTab === 'daily' && (
        <View style={styles.celebrationBanner}>
          <Text style={styles.celebrationText}>✨ Yeni görevler yükleniyor...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  trophyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  trophyIcon: {
    fontSize: 20,
    marginRight: 4,
  },
  trophyCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Tab Bar Stilleri
  tabBar: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexGrow: 0,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 4,
  },
  tabItemActive: {
    backgroundColor: '#FFD700',
  },
  tabIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  tabLabelActive: {
    color: '#333',
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  questList: {
    maxHeight: 350,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  questCard: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  questGradient: {
    padding: 12,
  },
  // Kompakt Row Layout
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  questLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  questIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  questInfo: {
    flex: 1,
  },
  questTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  questDescription: {
    fontSize: 11,
    color: '#666',
    marginBottom: 3,
  },
  questHint: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 2,
  },
  completedText: {
    color: '#FFFFFF',
  },
  // Mini Progress Row
  miniProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  miniProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 6,
    maxWidth: 80,
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  miniProgressText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#888',
  },
  // Quest Right
  questRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniRewards: {
    alignItems: 'flex-end',
  },
  miniRewardText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
  },
  // Mini Buttons
  miniStartBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4FC3F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniClaimBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#FFD700',
  },
  miniClaimText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#333',
  },
  miniDoneIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniDoneText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
  },
  // Eski stiller (backward compat)
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
  },
  questProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  questProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 8,
  },
  questProgressFill: {
    height: '100%',
    backgroundColor: '#FFA500',
    borderRadius: 3,
  },
  questProgressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    minWidth: 40,
    textAlign: 'right',
  },
  rewardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  claimButton: {
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  claimGradient: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  claimButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  claimedBadge: {
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 8,
    alignItems: 'center',
  },
  claimedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // 🎯 Yeni stiller - Hint ve Start Button
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
  },
  hintIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  hintText: {
    fontSize: 12,
    color: '#555',
    fontStyle: 'italic',
    flex: 1,
  },
  startButton: {
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  startGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  startButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginHorizontal: 4,
  },
  celebrationBanner: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    alignItems: 'center',
  },
  celebrationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
    textAlign: 'center',
  },
});
