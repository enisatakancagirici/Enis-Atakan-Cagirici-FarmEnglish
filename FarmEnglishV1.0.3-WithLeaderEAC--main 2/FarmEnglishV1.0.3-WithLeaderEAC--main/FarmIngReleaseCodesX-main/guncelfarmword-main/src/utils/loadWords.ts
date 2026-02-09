// 🇹🇷 Ana veri kaynağı - Türkçe anlamlar, örnekler, CEFR vs içerir
import ensaglamData from '../../assets/data/ensaglamdata_with_example_tr.json';
import type { WordModel } from '../models/types';

// 📦 JSON FORMAT: { items: [{ word, cefr, tr, example, example_tr }, ...] }
// tr alanı ";" ile ayrılmış anlamlar içerebilir - quiz'de "," olarak gösterilecek
export const loadWordsFromJSON = (): WordModel[] => {
  const items = (ensaglamData as { items: Array<{ word: string; cefr: string; tr: string; example: string; example_tr?: string }> }).items;
  
  const words: WordModel[] = items.map((item, index) => ({
    id: `word-${index}`,
    text: item.word,
    meaning: item.tr, // ";" ile ayrılmış anlamlar - quiz'de formatlanacak
    example: item.example || '',
    example_tr: item.example_tr || '', // 🇹🇷 Türkçe çeviri doğrudan JSON'dan
    difficulty: item.cefr as any, // Gerçek CEFR değeri
    type: 'noun',
    level: 0,
    correctCount: 0,
    wrongCount: 0,
    consecutiveCorrect: 0,
    harvestedCount: 0,
    totalHarvests: 0,
    masterLevel: 0,
  }));

  // Shuffle for variety
  return words.sort(() => Math.random() - 0.5);
};

// 🎯 Format meaning for quiz display: ";" -> ", "
export const formatMeaningForQuiz = (meaning: string): string => {
  return meaning.replace(/;\s*/g, ', ');
};

// 🎯 İlk anlamı al (";", ",", "/" vb ayırıcıları dikkate al)
export const getFirstMeaning = (meaning: string): string => {
  if (!meaning) return '';
  const normalized = meaning.replace(/\s+/g, ' ').trim();
  const semicolonSplit = normalized.split(';')[0] || '';
  const separatorSplit = semicolonSplit.split(/[\/,|•，,]/)[0] || '';
  const dashSplit = separatorSplit.split(' - ')[0] || '';
  return dashSplit.trim();
};

export const pickRandomWords = (count: number): WordModel[] => {
  const allWords = loadWordsFromJSON();
  return allWords.slice(0, count);
};
