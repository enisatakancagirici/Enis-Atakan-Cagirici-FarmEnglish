/**
 * 📝 Cümle Karşılaştırma Utility
 * Kullanıcının söylediği cümle ile hedef cümleyi karşılaştırır
 */

export interface WordMatch {
    word: string;
    isCorrect: boolean;
    spokenWord?: string; // Kullanıcının söylediği karşılık
}

export interface ComparisonResult {
    isCorrect: boolean;
    accuracy: number; // 0-100
    matchedWords: WordMatch[];
    missedWords: string[];
    extraWords: string[];
    targetWordCount: number;
    correctWordCount: number;
}

/**
 *  Sayıları kelimeye çevir (1 → one, 2 → two)
 */
function convertNumbersToWords(text: string): string {
    const numberMap: { [key: string]: string } = {
        '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
        '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
        '10': 'ten', '11': 'eleven', '12': 'twelve', '13': 'thirteen',
        '14': 'fourteen', '15': 'fifteen', '16': 'sixteen', '17': 'seventeen',
        '18': 'eighteen', '19': 'nineteen', '20': 'twenty', '30': 'thirty',
        '40': 'forty', '50': 'fifty', '60': 'sixty', '70': 'seventy',
        '80': 'eighty', '90': 'ninety', '100': 'hundred', '1000': 'thousand'
    };

    // Basit sayıları değiştir (0-20, 30, 40...)
    return text.replace(/\b\d+\b/g, (match) => {
        return numberMap[match] || match;
    });
}

/**
 * 🔧 Metni normalize et
 * - Küçük harfe çevir
 * - Sayıları kelimelere çevir
 * - Noktalama işaretlerini kaldır
 * - Fazla boşlukları temizle
 */
function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s']/g, '') // Noktalama sil (apostrophe hariç)
        .replace(/\s+/g, ' ')     // Çoklu boşlukları tek boşluğa
        .trim();
}

/**
 * 🔧 Metni normalize et + sayı dönüşümü
 */
function normalizeTextWithNumbers(text: string): string {
    const withWords = convertNumbersToWords(text);
    return normalizeText(withWords);
}

/**
 * 📏 İki kelime arasındaki benzerliği hesapla (Levenshtein distance based)
 */
function wordSimilarity(word1: string, word2: string): number {
    if (word1 === word2) return 1;

    const len1 = word1.length;
    const len2 = word2.length;

    // Boş kelime kontrolü
    if (len1 === 0 || len2 === 0) return 0;

    // Levenshtein distance
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = word1[i - 1] === word2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,     // deletion
                matrix[i][j - 1] + 1,     // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }

    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);

    return 1 - (distance / maxLen);
}

/**
 * 🎯 İki cümleyi karşılaştır
 */
export function compareSentences(spoken: string, target: string): ComparisonResult {
    const normalizedSpoken = normalizeTextWithNumbers(spoken);
    const normalizedTarget = normalizeTextWithNumbers(target);

    const spokenWords = normalizedSpoken.split(' ').filter(w => w.length > 0);
    const targetWords = normalizedTarget.split(' ').filter(w => w.length > 0);

    const matchedWords: WordMatch[] = [];
    const missedWords: string[] = [];
    const usedSpokenIndices = new Set<number>();

    // Her hedef kelime için en iyi eşleşmeyi bul
    for (const targetWord of targetWords) {
        let bestMatchIndex = -1;
        let bestSimilarity = 0;

        for (let i = 0; i < spokenWords.length; i++) {
            if (usedSpokenIndices.has(i)) continue;

            const similarity = wordSimilarity(targetWord, spokenWords[i]);

            // Exact match veya çok benzer (%80+)
            if (similarity > bestSimilarity && similarity >= 0.7) {
                bestSimilarity = similarity;
                bestMatchIndex = i;
            }
        }

        if (bestMatchIndex !== -1) {
            usedSpokenIndices.add(bestMatchIndex);
            matchedWords.push({
                word: targetWord,
                isCorrect: bestSimilarity === 1, // Tam eşleşme
                spokenWord: spokenWords[bestMatchIndex],
            });
        } else {
            // Eşleşme bulunamadı
            matchedWords.push({
                word: targetWord,
                isCorrect: false,
            });
            missedWords.push(targetWord);
        }
    }

    // Fazla kelimeler (hedefte olmayan)
    const extraWords: string[] = [];
    for (let i = 0; i < spokenWords.length; i++) {
        if (!usedSpokenIndices.has(i)) {
            extraWords.push(spokenWords[i]);
        }
    }

    // Doğru kelime sayısı
    const correctWordCount = matchedWords.filter(m => m.isCorrect).length;

    // Accuracy hesapla
    const accuracy = targetWords.length > 0
        ? Math.round((correctWordCount / targetWords.length) * 100)
        : 0;

    // Tam doğru mu?
    const isCorrect = accuracy >= 85 && extraWords.length <= 1;

    return {
        isCorrect,
        accuracy,
        matchedWords,
        missedWords,
        extraWords,
        targetWordCount: targetWords.length,
        correctWordCount,
    };
}

/**
 * 🏆 Accuracy'ye göre yıldız hesapla (1-3)
 */
export function getStarRating(accuracy: number): number {
    if (accuracy >= 95) return 3;
    if (accuracy >= 75) return 2;
    if (accuracy >= 50) return 1;
    return 0;
}

/**
 * 💬 Accuracy'ye göre geri bildirim mesajı
 */
export function getFeedbackMessage(accuracy: number): string {
    if (accuracy >= 95) return 'Mükemmel! 🎉';
    if (accuracy >= 85) return 'Harika! 👏';
    if (accuracy >= 70) return 'İyi! 👍';
    if (accuracy >= 50) return 'Fena değil! 💪';
    return 'Tekrar dene! 🔄';
}
