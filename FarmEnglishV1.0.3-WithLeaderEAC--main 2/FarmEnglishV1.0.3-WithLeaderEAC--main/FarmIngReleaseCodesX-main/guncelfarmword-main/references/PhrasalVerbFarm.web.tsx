import React, { useState, useMemo, useCallback } from 'react';
import { useFarmStore } from '@state/store';
import { useToastStore } from '@state/toastStore';
import { WordCardTW } from '@components/WordCardTW';
import { MiniQuizDialog } from '@components/MiniQuizDialog';
import { MassHarvestEffect } from '@components/MassHarvestEffect';
import { celebrate } from '@utils/confetti';
import { sound } from '@utils/sound';
import { TutorialHint } from '@components/TutorialHint';

export default function PhrasalVerbFarm() {
  const phrasalVerbFarm = useFarmStore(s => s.phrasalVerbFarm);
  const openMini = useFarmStore(s => s.openMiniQuiz);
  const miniQuizFor = useFarmStore(s => s.miniQuizFor);
  const answerMiniQuiz = useFarmStore(s => s.answerMiniQuiz);
  const xp = useFarmStore(s => s.xp);
  const level = useFarmStore(s => s.level);
  const pushToast = useToastStore(s => s.push);
  const targetWord = useMemo(() => phrasalVerbFarm.find(f => f.id === miniQuizFor), [phrasalVerbFarm, miniQuizFor]);
  const [massHarvestData, setMassHarvestData] = useState<{count: number, totalXP: number} | null>(null);
  const [prevXP, setPrevXP] = React.useState(xp);
  const [isXPGaining, setIsXPGaining] = React.useState(false);
  
  // 🔍 Arama ve Filtreleme
  const [searchQuery, setSearchQuery] = useState('');
  const [masteryFilter, setMasteryFilter] = useState<'all' | 'mastered' | 'learning' | 'struggling'>('all');
  
  // Count ready-to-harvest phrasal verbs
  const readyWords = useMemo(() => phrasalVerbFarm.filter(w => w.level >= 10), [phrasalVerbFarm]);
  const readyCount = readyWords.length;
  
  // 🎯 Memoized harvest handler
  const handleHarvest = useCallback((wordId: string) => {
    openMini(wordId);
  }, [openMini]);
  
  // 🔍 Filtreleme ve Arama
  const filteredFarm = useMemo(() => {
    return phrasalVerbFarm.filter(w => {
      // Arama filtresi
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesText = w.text.toLowerCase().startsWith(query);
        const matchesMeaning = w.meaning.toLowerCase().split(',').some((m: string) => m.trim().startsWith(query));
        if (!matchesText && !matchesMeaning) return false;
      }
      
      // Başarı oranına göre filtre
      if (masteryFilter !== 'all') {
        const total = w.correctCount + w.wrongCount;
        const ratio = total > 0 ? w.correctCount / total : 0;
        
        if (masteryFilter === 'mastered' && ratio < 0.8) return false;
        if (masteryFilter === 'learning' && (ratio < 0.3 || ratio >= 0.8)) return false;
        if (masteryFilter === 'struggling' && ratio >= 0.3) return false;
      }
      
      return true;
    });
  }, [phrasalVerbFarm, searchQuery, masteryFilter]);
  
  // XP Animation
  React.useEffect(() => {
    if (xp > prevXP) {
      setIsXPGaining(true);
      setTimeout(() => setIsXPGaining(false), 800);
    }
    setPrevXP(xp);
  }, [xp, prevXP]);
  
  // Calculate XP progress
  const xpInCurrentLevel = xp % 1000;
  const xpForNextLevel = 1000;
  const xpProgress = (xpInCurrentLevel / xpForNextLevel) * 100;
  const xpToNextLevel = xpForNextLevel - xpInCurrentLevel;
  
  const handleAnswer = (correct: boolean) => {
    const w = targetWord;
    if (!w) return;
    
    const currentCount = w.harvestedCount || 0;
    const newHarvestCount = correct ? currentCount + 1 : Math.max(0, currentCount - 1);
    const harvestLimit = 3;
    
    const currentConsecutive = w.consecutiveCorrect || 0;
    const newConsecutive = correct ? currentConsecutive + 1 : 0;
    const hasWrongAnswers = w.wrongCount > 0;
    const needsConsecutive = hasWrongAnswers && newConsecutive < 5;
    
    if (correct && newHarvestCount >= harvestLimit && !needsConsecutive) {
      celebrate();
      sound.playLevelUp();
      pushToast({ text: `🎉 "${w.text}" phrasal verb'ünü master oldun! +100 XP bonus!`, kind: 'success' });
    } else if (correct) {
      sound.playHarvest();
      celebrate();
      const progressMsg = `${newHarvestCount}/${harvestLimit} hasat`;
      const consecutiveMsg = needsConsecutive ? ` | 🎯 ${newConsecutive}/5 art arda` : '';
      pushToast({ text: `✅ Doğru! ${progressMsg}${consecutiveMsg}`, kind: 'success' });
    } else {
      sound.playError();
      const resetMsg = hasWrongAnswers ? ' | 🔄 Art arda 0/5 reset!' : '';
      pushToast({ text: `❌ Yanlış! ${newHarvestCount}/${harvestLimit} hasat${resetMsg}`, kind: 'error' });
    }
    
    answerMiniQuiz(w.id, correct);
  };

  const handleMassHarvest = () => {
    if (readyCount === 0) return;
    
    sound.playMassHarvest();
    celebrate();
    
    let totalXP = 0;
    readyWords.forEach(w => {
      openMini(w.id);
      setTimeout(() => {
        answerMiniQuiz(w.id, true);
        totalXP += 50;
      }, 100);
    });
    
    setMassHarvestData({ count: readyCount, totalXP: totalXP });
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto min-h-screen bg-gradient-to-b from-purple-950 via-indigo-950 to-purple-900">
      <TutorialHint
        page="phrasal-farm"
        title="📚 Phrasal Verb Tarlana Hoş Geldin! 🌟"
        description="Phrasal verb'lerini hasat ederek master ol! Quiz'lerden eklenen phrasal verbs burada büyür. Her doğru cevap sayacı artırır! 🎉"
        position="center"
      />
      
      {/* Mass Harvest Effect */}
      {massHarvestData && (
        <MassHarvestEffect 
          count={massHarvestData.count}
          totalXP={massHarvestData.totalXP}
          onComplete={() => setMassHarvestData(null)}
        />
      )}

      {/* Header with Mass Harvest Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-8">
        <h2 className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 uppercase tracking-wide drop-shadow-lg animate-pulse">
          📚 Phrasal Verb Tarlası ✨
        </h2>
        
        {readyCount > 0 && (
          <button
            onClick={handleMassHarvest}
            className="group relative px-4 sm:px-8 py-2 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 text-white font-black text-sm sm:text-xl uppercase shadow-2xl shadow-purple-500/80 border-2 sm:border-4 border-pink-400 hover:scale-110 active:scale-95 transition-all duration-200 animate-glow-pulse overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            
            <span className="relative z-10 flex items-center gap-3">
              <span className="text-3xl animate-bounce">⚡</span>
              <span>TOPLU HASAT</span>
              <span className="px-3 py-1 rounded-full bg-white/30 text-2xl font-black">{readyCount}</span>
            </span>
          </button>
        )}
      </div>
      
      {/* 🔍 Arama ve Filtreleme */}
      {phrasalVerbFarm.length > 0 && (
        <div className="mb-6 bg-purple-900/80 backdrop-blur-sm rounded-xl p-4 border-2 border-pink-500/30 shadow-xl shadow-purple-500/20">
          {/* Arama */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Phrasal verb ara... 🔍"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-purple-800/60 border-2 border-pink-500/40 rounded-lg px-4 py-3 pl-12 text-white placeholder-purple-300 focus:outline-none focus:border-pink-400 transition-colors"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300 hover:text-white transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          
          {/* Başarı Oranı Filtreleri */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setMasteryFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                masteryFilter === 'all'
                  ? 'bg-purple-600 text-white scale-105'
                  : 'bg-purple-800/60 text-purple-300 hover:bg-purple-700'
              }`}
            >
              Tümü ({phrasalVerbFarm.length})
            </button>
            <button
              onClick={() => setMasteryFilter('mastered')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                masteryFilter === 'mastered'
                  ? 'bg-green-600 text-white scale-105'
                  : 'bg-purple-800/60 text-purple-300 hover:bg-purple-700'
              }`}
            >
              🟢 Biliyorum ({phrasalVerbFarm.filter(w => {
                const total = w.correctCount + w.wrongCount;
                return total > 0 && (w.correctCount / total) >= 0.8;
              }).length})
            </button>
            <button
              onClick={() => setMasteryFilter('learning')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                masteryFilter === 'learning'
                  ? 'bg-yellow-600 text-white scale-105'
                  : 'bg-purple-800/60 text-purple-300 hover:bg-purple-700'
              }`}
            >
              🟡 Öğreniyorum ({phrasalVerbFarm.filter(w => {
                const total = w.correctCount + w.wrongCount;
                const ratio = total > 0 ? w.correctCount / total : 0;
                return ratio >= 0.3 && ratio < 0.8;
              }).length})
            </button>
            <button
              onClick={() => setMasteryFilter('struggling')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                masteryFilter === 'struggling'
                  ? 'bg-red-600 text-white scale-105'
                  : 'bg-purple-800/60 text-purple-300 hover:bg-purple-700'
              }`}
            >
              🔴 Çalışmalıyım ({phrasalVerbFarm.filter(w => {
                const total = w.correctCount + w.wrongCount;
                const ratio = total > 0 ? w.correctCount / total : 0;
                return ratio < 0.3;
              }).length})
            </button>
          </div>
        </div>
      )}

      {/* XP Progress Bar */}
      <div className="mb-4 sm:mb-6 bg-purple-900/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-5 border-2 border-pink-500/30 shadow-xl shadow-purple-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">👑</span>
            <div>
              <div className="text-white font-black text-2xl">Level {level}</div>
              <div className="text-purple-300 text-sm font-semibold">{xpInCurrentLevel} / {xpForNextLevel} XP</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-cyan-400 font-bold text-lg">{xpToNextLevel} XP kaldı</div>
            <div className="text-purple-400 text-xs">sonraki seviyeye</div>
          </div>
        </div>
        
        {/* XP Bar */}
        <div className="relative h-8 bg-purple-950 rounded-full overflow-hidden border-2 border-pink-500/50 shadow-inner">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20"></div>
          
          <div 
            className={`relative h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 transition-all duration-700 ease-out ${isXPGaining ? 'animate-pulse' : ''}`}
            style={{ width: `${xpProgress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"></div>
            
            {isXPGaining && (
              <div className="absolute inset-0 bg-white/30 animate-ping"></div>
            )}
          </div>
          
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-white font-black text-sm drop-shadow-lg ${isXPGaining ? 'animate-bounce' : ''}`}>
              {Math.floor(xpProgress)}%
            </span>
          </div>
        </div>
      </div>

      {phrasalVerbFarm.length === 0 && (
        <div className="text-center py-20 px-6">
          <div className="text-6xl mb-4">📚✨</div>
          <div className="text-purple-300 text-xl font-semibold mb-2">Phrasal Verb Tarlan Boş!</div>
          <div className="text-purple-400 text-md">
            Phrasal Verb Quiz çözerek tarlana ekle. 🎯
          </div>
        </div>
      )}
      
      {filteredFarm.length === 0 && phrasalVerbFarm.length > 0 && (
        <div className="text-center py-20 text-purple-300 text-xl font-semibold">
          Arama kriterlerine uygun phrasal verb bulunamadı. 🔍
        </div>
      )}
      
      <div 
        className="grid gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        style={{ 
          contain: 'layout style paint',
          transform: 'translateZ(0)',
          willChange: 'contents'
        }}
      >
        {filteredFarm.map(w => (
          <WordCardTW key={w.id} w={w} onHarvest={handleHarvest} />
        ))}
      </div>
      
      {targetWord && (
        <MiniQuizDialog word={targetWord} onClose={() => openMini(undefined as any)} onAnswer={handleAnswer} />
      )}
    </div>
  );
}
