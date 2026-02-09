import React, { useEffect, useState } from 'react';
import { useFarmStore } from '@state/store';
import { sound } from '@utils/sound';
import { celebrate } from '@utils/confetti';
import { useNavigate } from 'react-router-dom';

export default function PhrasalVerbs() {
  const navigate = useNavigate();
  const phrasalVerbs = useFarmStore(s => s.phrasalVerbs);
  const unlockedPhrasalVerbs = useFarmStore(s => s.unlockedPhrasalVerbs);
  const coins = useFarmStore(s => s.coins);
  const unlockPhrasalVerb = useFarmStore(s => s.unlockPhrasalVerb);
  const loadPhrasalVerbs = useFarmStore(s => s.loadPhrasalVerbs);
  const addPhrasalVerbToFarm = useFarmStore(s => s.addPhrasalVerbToFarm);
  const phrasalVerbFarm = useFarmStore(s => s.phrasalVerbFarm); // 🌱 Separate farm for phrasal verbs
  
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('A1');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (phrasalVerbs.length === 0) {
      loadPhrasalVerbs();
    }
  }, [phrasalVerbs, loadPhrasalVerbs]);

  const prices: Record<string, number> = {
    'A1': 50,
    'A2': 100,
    'B1': 200,
    'B2': 400,
    'C1': 800,
    'C2': 1500
  };

  const difficulties = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  const filteredVerbs = phrasalVerbs
    .filter(pv => pv.difficulty === selectedDifficulty)
    .filter(pv => {
      if (!searchTerm) return true;
      return pv.verb.toLowerCase().includes(searchTerm.toLowerCase()) ||
             pv.meaning.toLowerCase().includes(searchTerm.toLowerCase());
    });

  const handleUnlock = (verbId: string, difficulty: string) => {
    const price = prices[difficulty];
    if (coins < price) {
      sound.playWrong();
      return;
    }

    if (unlockPhrasalVerb(verbId, difficulty)) {
      celebrate();
      sound.playLevelUp();
    }
  };

  const unlockAll = (difficulty: string) => {
    const verbsToUnlock = phrasalVerbs.filter(
      pv => pv.difficulty === difficulty && !unlockedPhrasalVerbs.includes(pv.id)
    );

    const totalCost = verbsToUnlock.length * prices[difficulty];
    if (coins < totalCost) {
      sound.playWrong();
      return;
    }

    verbsToUnlock.forEach(pv => {
      unlockPhrasalVerb(pv.id, difficulty);
    });
    celebrate();
    sound.playLevelUp();
  };

  const stats = {
    total: phrasalVerbs.length,
    unlocked: unlockedPhrasalVerbs.length,
    byDifficulty: difficulties.map(diff => ({
      difficulty: diff,
      total: phrasalVerbs.filter(pv => pv.difficulty === diff).length,
      unlocked: phrasalVerbs.filter(pv => pv.difficulty === diff && unlockedPhrasalVerbs.includes(pv.id)).length
    }))
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto min-h-screen">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-5xl font-black text-white mb-3 drop-shadow-lg text-center">
          📚 PHRASAL VERBS
        </h1>
        <p className="text-center text-purple-300 text-base sm:text-xl font-bold mb-4">
          300 Phrasal Verb - Seviyene göre kilitle aç! 💰
        </p>
        
        {/* Quiz Buttons by Level */}
        <div className="mb-6">
          <p className="text-center text-purple-300 text-lg font-bold mb-4">Seviye Seç ve Quiz'e Başla:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto">
            {difficulties.map(diff => {
              const diffStats = stats.byDifficulty.find(d => d.difficulty === diff);
              const unlockedCount = diffStats?.unlocked || 0;
              const isDisabled = unlockedCount < 4;
              
              return (
                <button
                  key={diff}
                  onClick={() => !isDisabled && navigate(`/phrasal-verb-quiz/${diff.toLowerCase()}`)}
                  disabled={isDisabled}
                  className={`px-6 py-4 rounded-xl font-black text-lg shadow-lg transition-all duration-200 border-2 ${
                    isDisabled 
                      ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed opacity-50' 
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-green-400 hover:scale-105 hover:shadow-2xl'
                  }`}
                >
                  <div className="text-2xl mb-1">📖</div>
                  <div>{diff}</div>
                  <div className="text-xs mt-1">{unlockedCount} verb</div>
                </button>
              );
            })}
          </div>
          <p className="text-sm text-gray-400 mt-3 text-center">En az 4 phrasal verb kilidini açmalısın!</p>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-gradient-to-br from-green-900/60 to-emerald-900/60 rounded-xl p-4 border border-green-600/50 text-center">
            <div className="text-3xl mb-1">✅</div>
            <div className="text-green-300 text-xl font-black">{stats.unlocked}/{stats.total}</div>
            <div className="text-green-400 text-xs">Unlocked</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-900/60 to-amber-900/60 rounded-xl p-4 border border-yellow-600/50 text-center">
            <div className="text-3xl mb-1">💰</div>
            <div className="text-yellow-300 text-xl font-black">{coins}</div>
            <div className="text-yellow-400 text-xs">Coins</div>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-purple-900/60 to-pink-900/60 rounded-xl p-4 border border-purple-600/50 text-center">
            <div className="text-3xl mb-1">🎯</div>
            <div className="text-purple-300 text-xl font-black">{selectedDifficulty}</div>
            <div className="text-purple-400 text-xs">Seviye</div>
          </div>
        </div>
      </div>

      {/* Difficulty Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
        {difficulties.map(diff => {
          const stat = stats.byDifficulty.find(s => s.difficulty === diff);
          const isSelected = diff === selectedDifficulty;
          const allUnlocked = stat && stat.unlocked === stat.total;
          
          return (
            <button
              key={diff}
              onClick={() => setSelectedDifficulty(diff)}
              className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-black text-sm sm:text-base transition-all duration-200 ${
                isSelected
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white scale-110 shadow-lg shadow-pink-500/50'
                  : allUnlocked
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:scale-105'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-600'
              }`}
            >
              {diff}
              <div className="text-xs mt-1 opacity-80">
                {stat?.unlocked}/{stat?.total} {allUnlocked && '✅'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="🔍 Phrasal Verb ara... (örn: give up)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-gray-800 border-2 border-purple-600/50 text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
        />
      </div>

      {/* Unlock All Button */}
      {filteredVerbs.some(pv => !unlockedPhrasalVerbs.includes(pv.id)) && (
        <div className="mb-6 text-center">
          <button
            onClick={() => unlockAll(selectedDifficulty)}
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white font-black text-lg shadow-2xl hover:scale-105 transition-all duration-200 border-2 border-yellow-400"
          >
            💰 Tüm {selectedDifficulty} Seviyesini Aç
            <div className="text-sm mt-1">
              ({filteredVerbs.filter(pv => !unlockedPhrasalVerbs.includes(pv.id)).length} x {prices[selectedDifficulty]} = {filteredVerbs.filter(pv => !unlockedPhrasalVerbs.includes(pv.id)).length * prices[selectedDifficulty]} coin)
            </div>
          </button>
        </div>
      )}

      {/* Phrasal Verbs Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredVerbs.map(pv => {
          const isUnlocked = unlockedPhrasalVerbs.includes(pv.id);
          const price = prices[pv.difficulty];

          // Level-based styling
          const levelStyles = {
            A1: {
              gradient: 'from-green-900/70 via-emerald-900/60 to-teal-900/70',
              border: 'border-green-500/60',
              glow: 'shadow-lg shadow-green-500/30',
              animation: 'hover:shadow-green-500/50'
            },
            A2: {
              gradient: 'from-blue-900/70 via-cyan-900/60 to-sky-900/70',
              border: 'border-blue-500/60',
              glow: 'shadow-lg shadow-blue-500/30',
              animation: 'hover:shadow-blue-500/50'
            },
            B1: {
              gradient: 'from-yellow-900/70 via-amber-900/60 to-orange-900/70',
              border: 'border-yellow-500/60',
              glow: 'shadow-lg shadow-yellow-500/30',
              animation: 'hover:shadow-yellow-500/50'
            },
            B2: {
              gradient: 'from-orange-900/70 via-red-900/60 to-rose-900/70',
              border: 'border-orange-500/60',
              glow: 'shadow-lg shadow-orange-500/30',
              animation: 'hover:shadow-orange-500/50'
            },
            C1: {
              gradient: 'from-red-900/70 via-rose-900/60 to-pink-900/70',
              border: 'border-red-500/60',
              glow: 'shadow-lg shadow-red-500/30',
              animation: 'hover:shadow-red-500/50'
            },
            C2: {
              gradient: 'from-purple-900/70 via-violet-900/60 to-fuchsia-900/70',
              border: 'border-purple-500/60',
              glow: 'shadow-lg shadow-purple-500/30',
              animation: 'hover:shadow-purple-500/50'
            }
          };

          const style = levelStyles[pv.difficulty as keyof typeof levelStyles] || levelStyles.A1;

          return (
            <div
              key={pv.id}
              className={`relative rounded-2xl p-5 border-2 transition-all duration-300 ${
                isUnlocked
                  ? `bg-gradient-to-br ${style.gradient} ${style.border} ${style.glow} ${style.animation} hover:scale-105 animate-fade-in`
                  : 'bg-gradient-to-br from-gray-900/70 to-gray-800/60 border-gray-600/50 opacity-60'
              }`}
            >
              {/* Lock Overlay */}
              {!isUnlocked && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
                  <button
                    onClick={() => handleUnlock(pv.id, pv.difficulty)}
                    className={`px-6 py-3 rounded-xl font-black text-lg transition-all duration-200 ${
                      coins >= price
                        ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white hover:scale-110 shadow-lg'
                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
                    disabled={coins < price}
                  >
                    🔒 {price} Coin
                  </button>
                </div>
              )}

              {/* Content */}
              <div className={isUnlocked ? '' : 'blur-sm'}>
                {/* ⭐ Favorite Star Button */}
                {isUnlocked && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      useFarmStore.getState().toggleFavorite(pv.id);
                    }}
                    className={`absolute top-2 right-2 z-20 text-2xl transition-all duration-300 filter drop-shadow-lg ${
                      pv.isFavorite 
                        ? 'hover:scale-125 active:scale-110 animate-pulse' 
                        : 'hover:scale-125 active:scale-95 opacity-60 hover:opacity-100'
                    }`}
                    style={{
                      textShadow: pv.isFavorite ? '0 0 10px rgba(255, 215, 0, 0.8), 0 0 20px rgba(255, 215, 0, 0.4)' : 'none'
                    }}
                    title={pv.isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                  >
                    {pv.isFavorite ? '⭐' : '☆'}
                  </button>
                )}
                
                <div className="flex items-center justify-between mb-3">
                  <div className={`text-2xl font-black transition-all duration-300 ${
                    pv.difficulty === 'A1' ? 'text-green-300 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                    pv.difficulty === 'A2' ? 'text-blue-300 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' :
                    pv.difficulty === 'B1' ? 'text-yellow-300 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' :
                    pv.difficulty === 'B2' ? 'text-orange-300 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]' :
                    pv.difficulty === 'C1' ? 'text-red-300 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                    'text-purple-300 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                  }`}>
                    {pv.verb}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold border-2 animate-pulse ${
                    pv.difficulty === 'A1' ? 'bg-green-600/40 text-green-200 border-green-400/60' :
                    pv.difficulty === 'A2' ? 'bg-blue-600/40 text-blue-200 border-blue-400/60' :
                    pv.difficulty === 'B1' ? 'bg-yellow-600/40 text-yellow-200 border-yellow-400/60' :
                    pv.difficulty === 'B2' ? 'bg-orange-600/40 text-orange-200 border-orange-400/60' :
                    pv.difficulty === 'C1' ? 'bg-red-600/40 text-red-200 border-red-400/60' :
                    'bg-purple-600/40 text-purple-200 border-purple-400/60'
                  }`}>
                    {pv.difficulty}
                  </div>
                  {isUnlocked && pv.nextReview && new Date(pv.nextReview) <= new Date() && (
                    <div className="px-2 py-1 rounded-full text-xs font-bold bg-orange-600/30 text-orange-300 border border-orange-500/40 animate-pulse">
                      🔄 Tekrar Et
                    </div>
                  )}
                </div>

                <div className="text-white text-lg font-bold mb-2">
                  📖 {pv.meaning}
                </div>

                <div className="text-purple-300 text-sm italic bg-purple-900/30 rounded-lg p-3 border border-purple-600/30">
                  💬 "{pv.example}"
                </div>

                <div className="mt-3 text-xs text-gray-400">
                  🏷️ {pv.category}
                </div>

                {/* Mastery Progress */}
                {isUnlocked && pv.mastery !== undefined && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">Öğrenme</span>
                      <span className="text-xs font-bold text-purple-300">{pv.mastery || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          (pv.mastery || 0) >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                          (pv.mastery || 0) >= 50 ? 'bg-gradient-to-r from-yellow-500 to-amber-500' :
                          'bg-gradient-to-r from-red-500 to-orange-500'
                        }`}
                        style={{ width: `${pv.mastery || 0}%` }}
                      />
                    </div>
                    {pv.correctCount !== undefined && (
                      <div className="text-xs text-gray-500 mt-1">
                        ✓ {pv.correctCount} | ✗ {pv.wrongCount || 0}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isUnlocked && (
                <div className="absolute top-2 right-2 text-2xl animate-bounce">
                  ✅
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredVerbs.length === 0 && (
        <div className="text-center text-gray-500 text-xl py-12">
          Sonuç bulunamadı 😢
        </div>
      )}
    </div>
  );
}
