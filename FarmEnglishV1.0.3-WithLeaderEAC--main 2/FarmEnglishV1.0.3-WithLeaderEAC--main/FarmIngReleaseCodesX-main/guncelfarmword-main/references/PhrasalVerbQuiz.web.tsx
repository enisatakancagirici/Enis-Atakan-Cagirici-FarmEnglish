import React, { useState, useEffect } from 'react';
import { useFarmStore } from '@state/store';
import { sound } from '@utils/sound';
import { celebrate } from '@utils/confetti';
import { useNavigate, useParams } from 'react-router-dom';
import { ComboDisplay } from '@components/ComboDisplay';
import { FirstCorrectCelebration } from '@components/FirstCorrectCelebration';
import { ComboBreak } from '@components/ComboBreak';

interface QuizQuestion {
  id: string;
  verb: string;
  correctMeaning: string;
  example: string;
  options: string[];
  difficulty: string;
}

export default function PhrasalVerbQuiz() {
  const navigate = useNavigate();
  const { level } = useParams<{ level: string }>(); // Get level from URL (A1, A2, B1, B2)
  const phrasalVerbs = useFarmStore(s => s.phrasalVerbs);
  const unlockedPhrasalVerbs = useFarmStore(s => s.unlockedPhrasalVerbs);
  const addCoins = useFarmStore(s => s.addCoins);
  const addPhrasalVerbToFarm = useFarmStore(s => s.addPhrasalVerbToFarm);

  // Quiz state
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isQuizFinished, setIsQuizFinished] = useState(false);
  
  // Combo state
  const [combo, setCombo] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalCoinsEarned, setTotalCoinsEarned] = useState(0);
  
  // UI effects state
  const [showFirstCorrect, setShowFirstCorrect] = useState(false);
  const [showComboBreak, setShowComboBreak] = useState(false);

  // Initialize quiz on mount
  useEffect(() => {
    if (phrasalVerbs.length > 0 && unlockedPhrasalVerbs.length > 0) {
      generateQuiz();
    }
  }, []);

  const generateQuiz = () => {
    // Filter by level (URL parameter) and unlocked status
    const unlocked = phrasalVerbs.filter(pv => 
      unlockedPhrasalVerbs.includes(pv.id) && 
      pv.difficulty === level?.toUpperCase()
    );
    
    if (unlocked.length < 4) {
      return;
    }

    // Shuffle and take 10 verbs
    const shuffled = [...unlocked].sort(() => Math.random() - 0.5);
    const selectedVerbs = shuffled.slice(0, Math.min(10, unlocked.length));
    
    // Create questions
    const newQuestions: QuizQuestion[] = selectedVerbs.map(correct => {
      // Get 3 wrong answers (different from correct)
      const wrongOptions = unlocked
        .filter(pv => pv.id !== correct.id && pv.meaning !== correct.meaning)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      
      // Mix all options
      const allOptions = [correct, ...wrongOptions]
        .map(pv => pv.meaning)
        .sort(() => Math.random() - 0.5);
      
      return {
        id: correct.id,
        verb: correct.verb,
        correctMeaning: correct.meaning,
        example: correct.example,
        options: allOptions,
        difficulty: correct.difficulty
      };
    });

    setQuestions(newQuestions);
    setCurrentQuestionIndex(0);
    setScore(0);
    setCombo(0);
    setStreak(0);
    setSelectedAnswer(null);
    setIsQuizFinished(false);
    setTotalCoinsEarned(0);
  };

  const handleAnswerClick = (answer: string) => {
    // Prevent multiple clicks
    if (selectedAnswer !== null) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    setSelectedAnswer(answer);
    const isCorrect = answer === currentQuestion.correctMeaning;

    if (isCorrect) {
      handleCorrectAnswer(currentQuestion);
    } else {
      handleWrongAnswer(currentQuestion);
    }

    // Move to next question after 1.5 seconds
    setTimeout(() => {
      moveToNextQuestion();
    }, 1500);
  };

  const handleCorrectAnswer = (question: QuizQuestion) => {
    sound.playCorrect();
    
    const newScore = score + 1;
    const newCombo = combo + 1;
    const newStreak = streak + 1;
    
    setScore(newScore);
    setCombo(newCombo);
    setStreak(newStreak);

    // Show first correct celebration
    if (score === 0) {
      setShowFirstCorrect(true);
      setTimeout(() => setShowFirstCorrect(false), 2000);
    }

    // Calculate rewards with combo multiplier
    let comboMultiplier = 1;
    if (newCombo >= 10) comboMultiplier = 3;
    else if (newCombo >= 7) comboMultiplier = 2.5;
    else if (newCombo >= 5) comboMultiplier = 2;
    else if (newCombo >= 3) comboMultiplier = 1.5;

    const difficultyMultiplier: Record<string, number> = {
      'A1': 1, 'A2': 1.2, 'B1': 1.5, 'B2': 2, 'C1': 3, 'C2': 5
    };
    const diffMult = difficultyMultiplier[question.difficulty] || 1;
    
    const coinReward = Math.floor(15 * diffMult * comboMultiplier);
    const xpReward = coinReward * 2;

    addCoins(coinReward);
    setTotalCoinsEarned(totalCoinsEarned + coinReward);

    // Update store
    useFarmStore.setState(state => ({
      xp: state.xp + xpReward,
      totalCorrect: state.totalCorrect + 1,
      totalQuizzes: state.totalQuizzes + 1
    }));

    // Update learning progress
    const phrasalVerb = phrasalVerbs.find(pv => pv.id === question.id);
    if (phrasalVerb) {
      useFarmStore.getState().updatePhrasalVerbProgress(phrasalVerb.id, true);
      
      // 🌱 TARLAYA EKLE! (Doğru cevap)
      addPhrasalVerbToFarm({
        ...phrasalVerb,
        wasCorrect: true
      });
    }

    // Celebrate combo milestones
    if (newCombo === 3 || newCombo === 5 || newCombo === 7 || newCombo === 10) {
      celebrate();
      sound.playLevelUp();
    }
  };

  const handleWrongAnswer = (question: QuizQuestion) => {
    sound.playWrong();

    // Show combo break if combo was >= 3
    if (combo >= 3) {
      setShowComboBreak(true);
      setTimeout(() => setShowComboBreak(false), 2000);
    }

    setCombo(0);
    setStreak(0);

    // Update store
    useFarmStore.setState(state => ({
      totalWrong: state.totalWrong + 1,
      totalQuizzes: state.totalQuizzes + 1
    }));

    // Update learning progress
    const phrasalVerb = phrasalVerbs.find(pv => pv.id === question.id);
    if (phrasalVerb) {
      useFarmStore.getState().updatePhrasalVerbProgress(phrasalVerb.id, false);
      
      // 🌱 TARLAYA EKLE! (Yanlış cevap - kırmızı başlasın)
      addPhrasalVerbToFarm({
        ...phrasalVerb,
        wasCorrect: false
      });
    }
  };

  const moveToNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    
    if (nextIndex < questions.length) {
      setCurrentQuestionIndex(nextIndex);
      setSelectedAnswer(null);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    setIsQuizFinished(true);
    
    // Check for perfect quiz
    if (score === questions.length) {
      useFarmStore.setState(state => ({
        phrasalVerbQuizStats: {
          ...state.phrasalVerbQuizStats,
          perfectQuizzes: state.phrasalVerbQuizStats.perfectQuizzes + 1
        }
      }));
    }

    // Update max combo
    useFarmStore.setState(state => ({
      phrasalVerbQuizStats: {
        ...state.phrasalVerbQuizStats,
        maxCombo: Math.max(state.phrasalVerbQuizStats.maxCombo, combo)
      }
    }));
  };

  // Loading state
  if (questions.length === 0) {
    return (
      <div className="p-6 text-center text-white">
        <div className="text-6xl mb-4">⏳</div>
        <p className="text-xl">Quiz hazırlanıyor...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  
  // Result screen
  if (isQuizFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    const isPerfect = score === questions.length;

    return (
      <div className="p-6 max-w-2xl mx-auto min-h-screen flex items-center justify-center">
        <div className="bg-gradient-to-b from-purple-900/40 to-indigo-900/40 rounded-3xl p-8 border-4 border-purple-500/50 backdrop-blur-sm text-center">
          <div className="text-8xl mb-6">
            {isPerfect ? '🏆' : percentage >= 70 ? '🎉' : percentage >= 50 ? '👍' : '📚'}
          </div>
          
          <h2 className="text-4xl font-black text-white mb-4">
            {isPerfect ? 'MÜKEMMEL!' : percentage >= 70 ? 'Harika!' : percentage >= 50 ? 'İyi!' : 'Devam Et!'}
          </h2>
          
          <div className="space-y-4 mb-8">
            <div className="bg-green-900/50 rounded-xl p-4 border border-green-500/30">
              <div className="text-green-300 text-5xl font-black mb-2">
                {score}/{questions.length} Doğru
              </div>
              <div className="text-green-400 text-lg">%{percentage} Başarı</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-900/50 rounded-xl p-4 border border-blue-500/30">
                <div className="text-blue-300 text-3xl font-black">{totalCoinsEarned}</div>
                <div className="text-blue-400 text-sm">💰 Coin Kazandın</div>
              </div>
              <div className="bg-orange-900/50 rounded-xl p-4 border border-orange-500/30">
                <div className="text-orange-300 text-3xl font-black">{combo}</div>
                <div className="text-orange-400 text-sm">🔥 Max Combo</div>
              </div>
            </div>

            <div className="bg-red-900/50 rounded-xl p-4 border border-red-500/30">
              <div className="text-red-300 text-2xl font-black">{questions.length - score}</div>
              <div className="text-red-400 text-sm">❌ Yanlış</div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={generateQuiz}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-6 py-4 rounded-xl font-black text-xl transition-all"
            >
              🔄 Tekrar Dene
            </button>
            <button
              onClick={() => navigate('/phrasal-verbs')}
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-6 py-4 rounded-xl font-black text-xl transition-all"
            >
              📚 Phrasal Verbs
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz screen
  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto min-h-screen relative">
      {/* Effects */}
      {combo > 0 && <ComboDisplay combo={combo} maxCombo={10} />}
      {showFirstCorrect && <FirstCorrectCelebration />}
      {showComboBreak && <ComboBreak show={showComboBreak} />}
      
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-2xl font-black text-white">
            Soru {currentQuestionIndex + 1}/{questions.length}
          </div>
          <div className="flex gap-3">
            <div className="bg-gradient-to-r from-green-900/70 to-emerald-900/60 px-4 py-2 rounded-xl border border-green-600/50">
              <span className="text-green-300 font-black text-xl">✅ {score}</span>
            </div>
            {combo >= 3 && (
              <div className="bg-gradient-to-r from-orange-900/70 to-red-900/60 px-4 py-2 rounded-xl border border-orange-600/50 animate-pulse">
                <span className="text-orange-300 font-black text-xl">🔥 {combo}x COMBO</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 bg-gray-800/50 rounded-full overflow-hidden border border-gray-700/50">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-gradient-to-br from-purple-900/60 to-indigo-900/60 rounded-3xl p-8 border-4 border-purple-500/50 backdrop-blur-sm mb-6 shadow-2xl">
        <div className="mb-6">
          <div className="inline-block bg-purple-700/50 px-4 py-2 rounded-xl text-purple-200 text-sm font-bold mb-4 border border-purple-500/30">
            {currentQuestion.difficulty}
          </div>
          
          <h2 className="text-5xl sm:text-6xl font-black text-white mb-4 text-center">
            {currentQuestion.verb}
          </h2>
          
          <p className="text-purple-200 text-lg text-center italic bg-purple-800/30 py-3 px-4 rounded-xl border border-purple-500/20">
            "{currentQuestion.example}"
          </p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-3">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === option;
            const isCorrect = option === currentQuestion.correctMeaning;
            
            let buttonClass = "w-full p-4 rounded-2xl text-lg font-bold transition-all border-2 text-left";
            
            if (selectedAnswer) {
              if (isCorrect) {
                buttonClass += " bg-green-600 border-green-400 text-white scale-105";
              } else if (isSelected) {
                buttonClass += " bg-red-600 border-red-400 text-white";
              } else {
                buttonClass += " bg-gray-700/50 border-gray-600 text-gray-400";
              }
            } else {
              buttonClass += " bg-indigo-800/50 border-indigo-600 text-white hover:bg-indigo-700/60 hover:scale-105 hover:border-indigo-400 cursor-pointer";
            }

            return (
              <button
                key={index}
                onClick={() => handleAnswerClick(option)}
                disabled={selectedAnswer !== null}
                className={buttonClass}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {selectedAnswer && isCorrect ? '✅' : selectedAnswer && isSelected ? '❌' : '💬'}
                  </span>
                  <span>{option}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Back button */}
      <button
        onClick={() => navigate('/phrasal-verbs')}
        className="w-full bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white px-6 py-3 rounded-xl font-bold transition-all"
      >
        ← Geri Dön
      </button>
    </div>
  );
}
