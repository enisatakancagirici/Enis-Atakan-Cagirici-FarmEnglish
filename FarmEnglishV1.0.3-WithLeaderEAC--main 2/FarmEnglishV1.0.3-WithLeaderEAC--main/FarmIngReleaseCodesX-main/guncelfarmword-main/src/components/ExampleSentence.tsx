import React, { useState, useCallback, memo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions, Easing, LayoutChangeEvent } from 'react-native';
import { haptic, sound } from '../utils/sound';
import ensaglamData from '../../assets/data/ensaglamdata_with_example_tr.json';
import { formatMeaningForQuiz } from '../utils/loadWords';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ExampleSentenceProps {
  sentence: string;
  targetWord: string; // Quiz yapılan kelime - anlamı gösterilmeyecek
  categoryColor: string;
  compact?: boolean; // Küçük ekranlar için kompakt mod
  ultraCompact?: boolean; // Çok uzun cümleler için (6+ kelime) - daha da küçük
}

// 🇹🇷 Ana veri kaynağı - Türkçe anlamlar, örnekler, CEFR vs içerir
type WordEntry = { word: string; cefr: string; tr: string; example: string; example_tr?: string };
const wordList = (ensaglamData as { items: WordEntry[] }).items;
const wordDictionary: Record<string, { meaning_tr: string; example_en: string }> = {};
wordList.forEach(item => {
  wordDictionary[item.word.toLowerCase()] = { 
    meaning_tr: item.tr, 
    example_en: item.example 
  };
});

//  Irregular Verbs - v2/v3 → v1 mapping
const IRREGULAR_VERBS: Record<string, string> = {
  // be
  'was': 'be', 'were': 'be', 'been': 'be', 'am': 'be', 'is': 'be', 'are': 'be',
  // have
  'had': 'have', 'has': 'have',
  // do
  'did': 'do', 'done': 'do', 'does': 'do',
  // go
  'went': 'go', 'gone': 'go', 'goes': 'go',
  // come
  'came': 'come',
  // see
  'saw': 'see', 'seen': 'see',
  // take
  'took': 'take', 'taken': 'take',
  // get
  'got': 'get', 'gotten': 'get',
  // make
  'made': 'make',
  // know
  'knew': 'know', 'known': 'know',
  // think
  'thought': 'think',
  // say
  'said': 'say',
  // give
  'gave': 'give', 'given': 'give',
  // find
  'found': 'find',
  // tell
  'told': 'tell',
  // become
  'became': 'become',
  // leave
  'left': 'leave',
  // put
  'put': 'put',
  // keep
  'kept': 'keep',
  // let
  'let': 'let',
  // begin
  'began': 'begin', 'begun': 'begin',
  // seem - regular ama yaygın
  // feel
  'felt': 'feel',
  // bring
  'brought': 'bring',
  // write
  'wrote': 'write', 'written': 'write',
  // sit
  'sat': 'sit',
  // stand
  'stood': 'stand',
  // hear
  'heard': 'hear',
  // run
  'ran': 'run',
  // hold
  'held': 'hold',
  // read (okunuşu farklı)
  'read': 'read',
  // grow
  'grew': 'grow', 'grown': 'grow',
  // lose
  'lost': 'lose',
  // pay
  'paid': 'pay',
  // meet
  'met': 'meet',
  // set
  'set': 'set',
  // send
  'sent': 'send',
  // fall
  'fell': 'fall', 'fallen': 'fall',
  // speak
  'spoke': 'speak', 'spoken': 'speak',
  // buy
  'bought': 'buy',
  // lead
  'led': 'lead',
  // understand
  'understood': 'understand',
  // watch - regular
  // follow - regular
  // stop - regular
  // create - regular
  // spend
  'spent': 'spend',
  // win
  'won': 'win',
  // drive
  'drove': 'drive', 'driven': 'drive',
  // catch
  'caught': 'catch',
  // fly
  'flew': 'fly', 'flown': 'fly',
  // break
  'broke': 'break', 'broken': 'break',
  // build
  'built': 'build',
  // wear
  'wore': 'wear', 'worn': 'wear',
  // eat
  'ate': 'eat', 'eaten': 'eat',
  // drink
  'drank': 'drink', 'drunk': 'drink',
  // sleep
  'slept': 'sleep',
  // rise
  'rose': 'rise', 'risen': 'rise',
  // sing
  'sang': 'sing', 'sung': 'sing',
  // swim
  'swam': 'swim', 'swum': 'swim',
  // throw
  'threw': 'throw', 'thrown': 'throw',
  // draw
  'drew': 'draw', 'drawn': 'draw',
  // choose
  'chose': 'choose', 'chosen': 'choose',
  // sell
  'sold': 'sell',
  // teach
  'taught': 'teach',
  // fight
  'fought': 'fight',
  // lie (yatmak)
  'lay': 'lie', 'lain': 'lie',
  // cut
  'cut': 'cut',
  // hit
  'hit': 'hit',
  // shut
  'shut': 'shut',
  // cost
  'cost': 'cost',
  // hurt
  'hurt': 'hurt',
  // forget
  'forgot': 'forget', 'forgotten': 'forget',
  // hide
  'hid': 'hide', 'hidden': 'hide',
  // light
  'lit': 'light',
  // mean
  'meant': 'mean',
  // show
  'showed': 'show', 'shown': 'show',
  // spread
  'spread': 'spread',
  // strike
  'struck': 'strike',
  // wake
  'woke': 'wake', 'woken': 'wake',
  // bet
  'bet': 'bet',
  // burst
  'burst': 'burst',
  // deal
  'dealt': 'deal',
  // dig
  'dug': 'dig',
  // hang
  'hung': 'hang',
  // prove
  'proved': 'prove', 'proven': 'prove',
  // quit
  'quit': 'quit',
  // ride
  'rode': 'ride', 'ridden': 'ride',
  // seek
  'sought': 'seek',
  // shake
  'shook': 'shake', 'shaken': 'shake',
  // shine
  'shone': 'shine',
  // shoot
  'shot': 'shoot',
  // shrink
  'shrank': 'shrink', 'shrunk': 'shrink',
  // sink
  'sank': 'sink', 'sunk': 'sink',
  // slide
  'slid': 'slide',
  // spit
  'spat': 'spit',
  // split
  'split': 'split',
  // steal
  'stole': 'steal', 'stolen': 'steal',
  // stick
  'stuck': 'stick',
  // sting
  'stung': 'sting',
  // stink
  'stank': 'stink', 'stunk': 'stink',
  // swear
  'swore': 'swear', 'sworn': 'swear',
  // sweep
  'swept': 'sweep',
  // swing
  'swung': 'swing',
  // tear
  'tore': 'tear', 'torn': 'tear',
  // weave
  'wove': 'weave', 'woven': 'weave',
  // wind
  'wound': 'wind',
};

// 🔍 Basit stemming - kelime kökünü bul
const findWordStem = (word: string): string | null => {
  const clean = word.toLowerCase().replace(/[.,!?;:'""\u201C\u201D]/g, '').trim();
  
  // Direkt sözlükte varsa
  if (wordDictionary[clean]) return clean;
  
  // Irregular verb kontrolü - v2/v3 → v1
  if (IRREGULAR_VERBS[clean]) {
    const base = IRREGULAR_VERBS[clean];
    if (wordDictionary[base]) return base;
  }
  
  // Yaygın ekler - sırası önemli (en uzundan başla)
  const suffixes = [
    'ies', 'ied',  // try → tries, tried
    'ing', 'ed', 'er', 'est', 's',  // learn → learned, learning
    'ly', 'ness', 'ment', 'ful', 'less',  // quick → quickly
  ];
  
  for (const suffix of suffixes) {
    if (clean.endsWith(suffix) && clean.length > suffix.length + 2) {
      let stem = clean.slice(0, -suffix.length);
      
      // Özel durumlar
      if (suffix === 'ies' || suffix === 'ied') {
        stem = stem + 'y'; // tries → try, studied → study
      }
      if (suffix === 'ed' && stem.endsWith(stem[stem.length - 1]) && stem.length > 2) {
        // stopped → stop (çift harf varsa tek yap)
        const lastChar = stem[stem.length - 1];
        if (stem[stem.length - 2] === lastChar) {
          stem = stem.slice(0, -1);
        }
      }
      
      if (wordDictionary[stem]) return stem;
      
      // 'e' ekle dene (make → making → mak → make)
      const stemE = stem + 'e';
      if (wordDictionary[stemE]) return stemE;
    }
  }
  
  return null;
};

// 🎯 Phrasal verb kelimelerini ayır - "wake up" → ["wake", "up"]
const getPhrasalVerbParts = (targetWord: string): string[] => {
  const cleanTarget = targetWord.toLowerCase().replace(/[.,!?;:'""\u201C\u201D]/g, '').trim();
  // Boşlukla ayrılmış kelimeleri döndür
  return cleanTarget.split(/\s+/).filter(Boolean);
};

// 🎯 Quiz kelimesi kontrolü - stem tabanlı (consist = consists, run = running)
// Phrasal verb desteği: "wake up" → "wake" ve "up" ayrı ayrı highlight edilir
const isWordMatchingTarget = (word: string, targetWord: string, wordIndex?: number, allWords?: string[]): boolean => {
  const cleanWord = word.toLowerCase().replace(/[.,!?;:'""\u201C\u201D]/g, '').trim();
  const cleanTarget = targetWord.toLowerCase().replace(/[.,!?;:'""\u201C\u201D]/g, '').trim();
  
  // Phrasal verb kontrolü - birden fazla kelime varsa
  const targetParts = getPhrasalVerbParts(cleanTarget);
  
  if (targetParts.length > 1) {
    // Phrasal verb - her parçayı ayrı kontrol et
    for (const part of targetParts) {
      // 1. Direkt eşleşme
      if (cleanWord === part) return true;
      
      // 2. Stem tabanlı eşleşme (wake → wakes, woke, waking)
      if (cleanWord.startsWith(part) || part.startsWith(cleanWord)) {
        const minLen = Math.min(cleanWord.length, part.length);
        const maxLen = Math.max(cleanWord.length, part.length);
        if (minLen >= 2 && (maxLen - minLen) <= 4) return true;
      }
      
      // 3. Stem tabanlı karşılaştırma
      const wordStem = findWordStem(cleanWord);
      const partStem = findWordStem(part);
      
      if (wordStem && wordStem === part) return true;
      if (partStem && partStem === cleanWord) return true;
      if (wordStem && partStem && wordStem === partStem) return true;
    }
    return false;
  }
  
  // Tek kelimelik target - eski mantık
  // 1. Direkt eşleşme
  if (cleanWord === cleanTarget) return true;
  
  // 2. Birinin diğerinin başlangıcı olması (consist → consists)
  if (cleanWord.startsWith(cleanTarget) || cleanTarget.startsWith(cleanWord)) {
    // En az 3 harf aynı olmalı ve fark en fazla 4 harf olmalı
    const minLen = Math.min(cleanWord.length, cleanTarget.length);
    const maxLen = Math.max(cleanWord.length, cleanTarget.length);
    if (minLen >= 3 && (maxLen - minLen) <= 4) return true;
  }
  
  // 3. Stem tabanlı karşılaştırma
  const wordStem = findWordStem(cleanWord);
  const targetStem = findWordStem(cleanTarget);
  
  if (wordStem && wordStem === cleanTarget) return true;
  if (targetStem && targetStem === cleanWord) return true;
  if (wordStem && targetStem && wordStem === targetStem) return true;
  
  return false;
};

// ☁️ Cute Cloud Tooltip - Apple-style, Juicy, No Modal!
const CloudTooltip = memo<{ 
  word: string; 
  visible: boolean; 
  onClose: () => void;
  isTargetWord: boolean;
  position: { x: number; y: number; width: number };
  containerLayout: { x: number; y: number; width: number } | null;
}>(({ 
  word, 
  visible, 
  onClose,
  isTargetWord,
  position,
  containerLayout,
}) => {
  const [definition, setDefinition] = useState<string>('');
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  // 🎯 Find definition
  useEffect(() => {
    if (visible && word) {
      const cleanWord = word.toLowerCase().replace(/[.,!?;:'""\u201C\u201D]/g, '').trim();
      
      if (isTargetWord) {
        setDefinition('Quiz kelimesi 🎯');
        return;
      }
      
      let wordData = wordDictionary[cleanWord];
      if (wordData) {
        // ";" ile ayrılmış anlamları ", " ile göster
        setDefinition(formatMeaningForQuiz(wordData.meaning_tr));
        return;
      }
      
      const stem = findWordStem(cleanWord);
      if (stem) {
        wordData = wordDictionary[stem];
        if (wordData) {
          setDefinition(formatMeaningForQuiz(wordData.meaning_tr));
          return;
        }
      }
      
      setDefinition('Sözlükte yok 💭');
    }
  }, [visible, word, isTargetWord]);

  // 🎬 Animation
  useEffect(() => {
    if (visible) {
      // Reset
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      floatAnim.setValue(0);
      
      // Bounce in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      // Gentle float animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -4,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Auto dismiss after 2.5s
      const timer = setTimeout(() => {
        dismissCloud();
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [visible, word]);

  const dismissCloud = useCallback(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }, [onClose, scaleAnim, opacityAnim]);

  if (!visible) return null;

  // 📐 Cloud boyutları (sabit)
  const cloudWidth = 180;
  const cloudHeight = 85; // Yaklaşık cloud yüksekliği
  const tailHeight = 12;
  const containerWidth = containerLayout?.width || SCREEN_WIDTH;
  
  // 🎯 Cloud artık wordsContainer İÇİNDE!
  // position.x/y = kelimenin wordsContainer içindeki pozisyonu (direkt kullanılabilir)
  
  // 🎯 X pozisyonu: Kelimenin TAM ortasına hizala
  const wordCenterX = position.x + (position.width / 2);
  let cloudLeft = wordCenterX - (cloudWidth / 2);
  // Container sınırları içinde tut
  cloudLeft = Math.max(-8, Math.min(cloudLeft, containerWidth - cloudWidth - 8));
  
  // 🎯 Tail (ok işareti) kelimenin tam ortasını göstersin
  const tailOffset = Math.max(16, Math.min(cloudWidth - 16, wordCenterX - cloudLeft));
  
  // 🎯 Y pozisyonu: Cloud kelimenin TAM ÜSTÜNDE
  // position.y = kelimenin wordsContainer içindeki Y değeri
  // Cloud'un alt kenarı (tail dahil) kelimenin üst kenarına gelsin
  const cloudTop = position.y - cloudHeight - tailHeight + 2;

  return (
    <Animated.View 
      style={[
        styles.cloudContainer,
        {
          left: cloudLeft,
          top: cloudTop,
          opacity: opacityAnim,
          transform: [
            { scale: scaleAnim },
            { translateY: floatAnim },
          ],
        }
      ]}
      pointerEvents="box-none"
    >
      {/* ☁️ Cloud Body - Sadece buna basınca kapansın */}
      <Pressable onPress={dismissCloud}>
        <View style={styles.cloudBody}>
          <Text style={styles.cloudWord}>{word.replace(/[.,!?;:'""\u201C\u201D]/g, '')}</Text>
          <Text style={styles.cloudDefinition} numberOfLines={3}>{definition}</Text>
        </View>
      </Pressable>
      
      {/* 🔻 Cloud Tail - Tam kelimenin ortasını gösterir */}
      <View style={[styles.cloudTail, { left: tailOffset - 10 }]} />
      <View style={[styles.cloudTailInner, { left: tailOffset - 8 }]} />
    </Animated.View>
  );
});

// 🎯 Main Example Sentence Component
export const ExampleSentence = memo(({ 
  sentence, 
  targetWord,
  categoryColor,
  compact = false,
  ultraCompact = false,
}: ExampleSentenceProps) => {
  const [selectedWord, setSelectedWord] = useState<{ word: string; position: { x: number; y: number; width: number } } | null>(null);
  const [containerLayout, setContainerLayout] = useState<{ x: number; y: number; width: number } | null>(null);
  const [wordPositions, setWordPositions] = useState<Record<number, { x: number; y: number; width: number }>>({});
  const scaleAnims = useRef<Record<number, Animated.Value>>({}).current;

  // Split sentence into words - handle undefined
  if (!sentence) return null;
  const words = sentence.split(' ');

  const handleWordPress = useCallback((word: string, index: number) => {
    haptic.light();

    const cleanedWord = word.replace(/[.,!?;:'"\u201C\u201D]/g, '').trim();
    const cleanedWordSafe = word.replace(/[.,!?;:'"\u201C\u201D]/g, '').trim();
    const spokenWord = cleanedWordSafe.length > 0 ? cleanedWordSafe : cleanedWord;
    if (spokenWord.length > 0) {
      sound.speakWord(spokenWord, 'en-US');
    }
    
    // Animate scale
    if (!scaleAnims[index]) {
      scaleAnims[index] = new Animated.Value(1);
    }
    
    Animated.sequence([
      Animated.spring(scaleAnims[index], {
        toValue: 0.9,
        useNativeDriver: true,
        speed: 50,
      }),
      Animated.spring(scaleAnims[index], {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
      }),
    ]).start();

    // Get word position for cloud tooltip
    const pos = wordPositions[index] || { x: 0, y: 0, width: 50 };
    
    // 🚀 INSTANT SWITCH: Direkt yeni kelimeyi set et (key prop sayesinde component resetlenecek)
    setSelectedWord({ word, position: pos });
  }, [scaleAnims, wordPositions]);

  const handleCloseTooltip = useCallback(() => {
    setSelectedWord(null);
  }, []);

  const handleWordLayout = useCallback((index: number, event: LayoutChangeEvent) => {
    const { x, y, width } = event.nativeEvent.layout;
    setWordPositions(prev => ({
      ...prev,
      [index]: { x, y, width }
    }));
  }, []);

  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const { x, y, width } = event.nativeEvent.layout;
    setContainerLayout({ x, y, width });
  }, []);

  return (
    <View style={[styles.container, compact && styles.containerCompact, ultraCompact && styles.containerUltraCompact]}>
      <View style={[styles.labelRow, compact && styles.labelRowCompact]}>
        <Text style={[styles.label, compact && styles.labelCompact]}>📖 Örnek Cümle</Text>
      </View>
      
      <View 
        style={[styles.sentenceCard, compact && styles.sentenceCardCompact, ultraCompact && styles.sentenceCardUltraCompact, { borderColor: categoryColor + '40' }]}
        onLayout={handleContainerLayout}
      >
        <View style={styles.wordsContainer}>
          {words.map((word, index) => {
            // Clean word for matching - stem tabanlı kontrol
            const isTarget = isWordMatchingTarget(word, targetWord);
            const scale = scaleAnims[index] || new Animated.Value(1);
            
            return (
              <Pressable
                key={`word-${index}`}
                onPress={() => handleWordPress(word, index)}
                style={styles.wordPressable}
              >
                <Animated.View
                  onLayout={(e) => handleWordLayout(index, e)}
                  style={[
                    styles.wordChip,
                    compact && styles.wordChipCompact,
                    ultraCompact && styles.wordChipUltraCompact,
                    isTarget && [styles.wordChipTarget, { backgroundColor: categoryColor + '20', borderColor: categoryColor }],
                    { transform: [{ scale }] },
                  ]}
                >
                  <Text
                    style={[
                      styles.wordText,
                      compact && styles.wordTextCompact,
                      ultraCompact && styles.wordTextUltraCompact,
                      isTarget && [styles.wordTextTarget, { color: categoryColor }],
                      isTarget && ultraCompact && styles.wordTextTargetUltraCompact,
                    ]}
                  >
                    {word}
                  </Text>
                </Animated.View>
              </Pressable>
            );
          })}
          
          {/* ☁️ Cloud Tooltip - wordsContainer içinde, kelimenin TAM üstünde */}
          <CloudTooltip
            key={selectedWord?.word || 'none'}
            word={selectedWord?.word || ''}
            visible={!!selectedWord}
            onClose={handleCloseTooltip}
            isTargetWord={isWordMatchingTarget(selectedWord?.word || '', targetWord)}
            position={selectedWord?.position || { x: 0, y: 0, width: 50 }}
            containerLayout={containerLayout}
          />
        </View>
        
        {!compact && <Text style={styles.hint}>💡 Kelimelere Tıkla & Anlamlarını Öğren</Text>}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 8,
  },
  containerCompact: {
    marginVertical: 4,
  },
  containerUltraCompact: {
    marginVertical: 4,
  },
  labelRow: {
    marginBottom: 4,
  },
  labelRowCompact: {
    marginBottom: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  labelCompact: {
    fontSize: 10,
  },
  sentenceCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 20,
    borderWidth: 2,
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    position: 'relative',
    overflow: 'visible',
  },
  sentenceCardCompact: {
    padding: 10,
    gap: 8,
    borderRadius: 14,
  },
  sentenceCardUltraCompact: {
    padding: 9,
    gap: 7,
    borderRadius: 13,
    borderWidth: 1.75,
  },
  wordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    overflow: 'visible', // CloudTooltip kelimenin üstünde görünsün
    position: 'relative',
    zIndex: 1,
  },
  wordPressable: {
    // No extra styles
  },
  wordChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
    borderWidth: 2,
    borderColor: 'rgba(71, 85, 105, 0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  wordChipCompact: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  wordChipUltraCompact: {
    paddingHorizontal: 7.5,
    paddingVertical: 4.5,
    borderRadius: 9.5,
    borderWidth: 1.25,
  },
  wordChipTarget: {
    borderWidth: 2.5,
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  wordText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    letterSpacing: 0.3,
  },
  wordTextCompact: {
    fontSize: 12,
  },
  wordTextUltraCompact: {
    fontSize: 11.5,
  },
  wordTextTarget: {
    fontWeight: '900',
    fontSize: 17,
  },
  wordTextTargetUltraCompact: {
    fontSize: 14,
  },
  hint: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // ☁️ Cloud Tooltip Styles - Cute & Juicy!
  cloudOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  cloudContainer: {
    position: 'absolute',
    width: 180,
    zIndex: 1001,
  },
  cloudBody: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  cloudWord: {
    fontSize: 16,
    fontWeight: '800',
    color: '#22c55e',
    textAlign: 'center',
    marginBottom: 6,
    textTransform: 'capitalize',
  },
  cloudDefinition: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 20,
  },
  cloudTail: {
    position: 'absolute',
    bottom: -10,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(34, 197, 94, 0.3)',
  },
  cloudTailInner: {
    position: 'absolute',
    bottom: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#ffffff',
  },
});
