/**
 * Firebase Battle Service
 * FarmEnglish Gerçek Zamanlı Savaş Sistemi
 * 
 * Özellikler:
 * - Benzersiz nickname kayıt
 * - Gerçek zamanlı matchmaking
 * - Arkadaşla savaş (oda kodu)
 * - Liderlik tablosu
 */

import { initializeApp, getApps } from 'firebase/app';
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp,
    increment,
    Timestamp,
    writeBatch,
    runTransaction,
} from 'firebase/firestore';
import { isNicknameClean } from './nicknameModeration';
export { isNicknameClean } from './nicknameModeration';

function isNicknameCleanSafe(nickname: string): boolean {
    try {
        if (typeof isNicknameClean !== 'function') return false;
        return isNicknameClean(nickname);
    } catch (error) {
        console.warn('[nicknameModeration] validator failed:', error);
        return false;
    }
}

// Firebase Config - GoogleService-Info.plist'ten alındı
const firebaseConfig = {
    apiKey: 'AIzaSyBN_-fg6G4l0CJhEJKCUEVx-2cExQmw3pY',
    projectId: 'farmenglish-1919',
    storageBucket: 'farmenglish-1919.firebasestorage.app',
    messagingSenderId: '519253828806',
    appId: '1:519253828806:ios:50b252f914bc03b729e3c7',
};

// Firebase'i sadece bir kez initialize et
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// ===============================
// 📦 TİPLER
// ===============================

export interface BattleUser {
    odId: string;
    nickname: string;
    level: number;
    battleWins: number;
    battleLosses: number;
    bestStreak: number;
    currentStreak: number;
    totalScore: number;
    createdAt: any;
    lastActiveAt: any;
}

// Answer record for tracking known/unknown words
export interface AnswerRecord {
    questionIndex: number;
    wordText: string;
    wordId: string;
    isCorrect: boolean;
    selectedAnswer: string;
    timeMs: number;
}

export interface BattleRoom {
    id: string;
    roomCode: string;
    hostId: string;
    hostNickname: string;
    guestId: string | null;
    guestNickname: string | null;
    status: 'waiting' | 'ready' | 'inProgress' | 'finished' | 'abandoned';
    questions: BattleQuestion[];
    hostScore: number;
    guestScore: number;
    hostProgress: number;
    guestProgress: number;
    hostLastActiveAt: any;
    guestLastActiveAt: any;
    hostDisconnected?: boolean;
    guestDisconnected?: boolean;
    // Answer tracking (server-authoritative)
    hostAnswered?: number[];     // Duplicate prevention
    guestAnswered?: number[];
    hostAnswers?: AnswerRecord[]; // For result report
    guestAnswers?: AnswerRecord[];
    createdAt: any;
    startedAt: any | null;
    finishedAt: any | null;
    winnerId?: string | null;
    abandonedBy?: string; // OD ID of the player who intentionally left
    // 🎭 Emoji mesajları
    lastEmoji?: {
        senderId: string;
        emoji: string;
        timestamp: number;
    };
}

export interface BattleQuestion {
    wordId: string;
    wordText: string;
    correctAnswer: string;
    options: string[];
}

export interface MatchmakingEntry {
    odId: string;
    nickname: string;
    level: number;
    createdAt: any;
}

export interface LeaderboardEntry {
    odId: string;
    nickname: string;
    wins: number;
    streak: number;
    level: number;
    score: number;
    harvestCount?: number; // 🌾 Hasat sayısı - En İyi Çiftçi sıralaması için
    puzzleScore?: number;  // 🧩 Yapboz puanı - Cümle Kurma Ustası
    sesyapScore?: number;  // 🎤 SesYap puanı - Konuşma Ustası
    trophies?: number;     // 🏆 Günlük görev kupaları
    // 📚 Pratik Merkezi Skorları
    wordMatchScore?: number;    // Kelime Eşleştirme puanı
    fillBlankScore?: number;    // Boşluk Doldur puanı
    collocationsScore?: number; // Collocations puanı
    idiomsScore?: number;       // Deyimler puanı
    ydsScore?: number;          // 🎓 YDS puanı
    wordFormsScore?: number; // 📝 Kelime Formları puanı
    quizComboScore?: number;
    totalPracticeScore?: number; // 📊 Toplam Pratik Puanı (Tüm pratiklerin toplamı)
    generalScore?: number;       // ⭐ Genel Sıralama Puanı (composit)
}

// ===============================
// 👤 KULLANICI İŞLEMLERİ
// ===============================

/**
 * Nickname'in benzersiz olup olmadığını kontrol et
 */
export async function checkNicknameAvailable(nickname: string): Promise<boolean> {
    try {
        const trimmedNickname = nickname?.trim() || '';
        if (trimmedNickname.length < 2 || trimmedNickname.length > 15) return false;
        if (!isNicknameCleanSafe(trimmedNickname)) return false;

        const normalizedNickname = trimmedNickname.toLowerCase();
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('nicknameLower', '==', normalizedNickname));
        const snapshot = await getDocs(q);
        return snapshot.empty;
    } catch (error) {
        console.error('Nickname kontrolü hatası:', error);
        return false;
    }
}

/**
 * Yeni kullanıcı kaydet
 */
export async function registerUser(
    odId: string,
    nickname: string,
    level: number = 1
): Promise<{ success: boolean; error?: string }> {
    try {
        // Önce nickname kontrolü
        const trimmedNickname = nickname?.trim() || '';
        if (trimmedNickname.length < 2) {
            return { success: false, error: 'Takma ad en az 2 karakter olmali' };
        }
        if (trimmedNickname.length > 15) {
            return { success: false, error: 'Takma ad en fazla 15 karakter olabilir' };
        }
        if (!isNicknameCleanSafe(trimmedNickname)) {
            return { success: false, error: 'Bu kullanici adi uygunsuz ifade iceriyor' };
        }
        const isAvailable = await checkNicknameAvailable(trimmedNickname);
        if (!isAvailable) {
            return { success: false, error: 'Bu kullanıcı adı zaten alınmış' };
        }

        const userRef = doc(db, 'users', odId);
        const userData: BattleUser = {
            odId,
            nickname: trimmedNickname,
            level,
            battleWins: 0,
            battleLosses: 0,
            bestStreak: 0,
            currentStreak: 0,
            totalScore: 0,
            createdAt: serverTimestamp(),
            lastActiveAt: serverTimestamp(),
        };

        await setDoc(userRef, {
            ...userData,
            nicknameLower: trimmedNickname.toLowerCase(), // Arama için
        });

        return { success: true };
    } catch (error: any) {
        console.error('Kullanıcı kayıt hatası:', error);
        return { success: false, error: error.message || 'Kayıt başarısız' };
    }
}

/**
 * Kullanıcı bilgilerini getir
 */
export async function getUser(odId: string): Promise<BattleUser | null> {
    try {
        const userRef = doc(db, 'users', odId);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
            return snapshot.data() as BattleUser;
        }
        return null;
    } catch (error) {
        console.error('Kullanıcı getirme hatası:', error);
        return null;
    }
}

/**
 * Kullanıcı istatistiklerini güncelle (debounced - 2s window)
 * Concurrent çağrılar tek bir updateDoc'ta birleştirilir
 */
const _pendingStats: Record<string, Record<string, any>> = {};
const _pendingTimers: Record<string, ReturnType<typeof setTimeout>> = {};

function isSafeFirestoreValue(value: any): boolean {
    if (value === undefined || value === null) return false;
    if (typeof value === 'number' && !Number.isFinite(value)) return false;
    return true;
}

async function _flushStats(odId: string): Promise<void> {
    const safeOdId = typeof odId === 'string' ? odId.trim() : '';
    if (!safeOdId) return;

    const updates = _pendingStats[safeOdId];
    delete _pendingStats[safeOdId];
    delete _pendingTimers[safeOdId];
    if (!updates || Object.keys(updates).length === 0) return;

    try {
        const userRef = doc(db, 'users', safeOdId);
        const firestoreUpdates: Record<string, any> = { lastActiveAt: serverTimestamp() };

        for (const [key, value] of Object.entries(updates)) {
            if (!isSafeFirestoreValue(value)) continue;
            if (key === 'lifetimeHarvests') {
                firestoreUpdates[key] = increment(1);
            } else {
                firestoreUpdates[key] = value;
            }
        }

        if (Object.keys(firestoreUpdates).length <= 1) return;
        await updateDoc(userRef, firestoreUpdates);
    } catch (error) {
        console.error('Istatistik guncelleme hatasi:', error);
    }
}

export async function updateUserStats(
    odId: string,
    updates: Partial<Pick<BattleUser, 'battleWins' | 'battleLosses' | 'bestStreak' | 'currentStreak' | 'totalScore' | 'level'>> & { 
        lifetimeHarvests?: number;
        puzzleScore?: number;
        sesyapScore?: number;
        trophies?: number;
    }
): Promise<void> {
    const safeOdId = typeof odId === 'string' ? odId.trim() : '';
    if (!safeOdId || !updates || typeof updates !== 'object') return;

    const sanitizedEntries = Object.entries(updates).filter(([, value]) => isSafeFirestoreValue(value));
    if (sanitizedEntries.length === 0) return;
    const sanitizedUpdates = Object.fromEntries(sanitizedEntries);

    if (!_pendingStats[safeOdId]) _pendingStats[safeOdId] = {};
    Object.assign(_pendingStats[safeOdId], sanitizedUpdates);

    if (_pendingTimers[safeOdId]) clearTimeout(_pendingTimers[safeOdId]);
    _pendingTimers[safeOdId] = setTimeout(() => _flushStats(safeOdId), 2000);
}

// ===============================
// 🎮 MATCHMAKING (HIZLI EŞLEŞME)
// ===============================

/**
 * Eşleşme kuyruğuna katıl
 */
export async function joinMatchmaking(
    odId: string,
    nickname: string,
    level: number
): Promise<string> {
    try {
        const matchmakingRef = doc(db, 'matchmaking', odId);
        await setDoc(matchmakingRef, {
            odId,
            nickname,
            level,
            createdAt: serverTimestamp(),
        });
        console.log(`[Matchmaking] Kuyruğa katıldı: ${nickname} (${odId}), seviye: ${level}`);
        return odId;
    } catch (error) {
        console.error('Matchmaking katılım hatası:', error);
        throw error;
    }
}

/**
 * Eşleşme kuyruğundan çık
 */
export async function leaveMatchmaking(odId: string): Promise<void> {
    try {
        const matchmakingRef = doc(db, 'matchmaking', odId);
        await deleteDoc(matchmakingRef);
    } catch (error) {
        console.error('Matchmaking çıkış hatası:', error);
    }
}

/**
 * Uygun rakip bul (benzer seviye)
 * Basitleştirildi - index gerektirmeyen sorgu
 */
export async function findOpponent(
    odId: string,
    level: number
): Promise<MatchmakingEntry | null> {
    try {
        const matchmakingRef = collection(db, 'matchmaking');

        // Basit sorgu - index gerektirmez, client-side filtrele
        const q = query(
            matchmakingRef,
            orderBy('createdAt', 'desc'),
            limit(20) // En fazla 20 oyuncu al
        );

        const snapshot = await getDocs(q);
        console.log(`[Matchmaking] Kuyrukta ${snapshot.docs.length} oyuncu bulundu, arayan: ${odId}`);

        // Client-side filtrele: Kendini hariç tut ve ZOMBI KONTROLÜ (60 sn)
        const now = Date.now();
        const candidates: MatchmakingEntry[] = [];

        for (const doc of snapshot.docs) {
            const entry = doc.data() as MatchmakingEntry;
            const entryTime = entry.createdAt?.toMillis ? entry.createdAt.toMillis() : (entry.createdAt?.seconds * 1000 || 0);

            //  ZOMBI KONTROLÜ: 60 saniyeden eski kayıtları yoksay!
            if (now - entryTime > 60000) {
                console.log(`[Matchmaking] Zombi kayıt atlandı: ${entry.nickname} (${Math.round((now - entryTime) / 1000)}sn önce)`);
                // İstersen burada deleteDoc ile temizleyebilirsin ama async gerek
                // deleteDoc(doc.ref).catch(console.error);
                continue;
            }

            console.log(`[Matchmaking] Kontrol edilen oyuncu: ${entry.odId}, seviye: ${entry.level}`);
            if (entry.odId !== odId) {
                // Tüm oyuncuları kabul et (seviye fark etmez)
                candidates.push(entry);
                console.log(`[Matchmaking] Uygun rakip bulundu: ${entry.nickname}`);
            }
        }

        // İlk uygun rakibi döndür (veya en yakın seviyeyi bulabilirsin)
        if (candidates.length > 0) {
            // En yakın seviyeyi bul
            candidates.sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level));
            console.log(`[Matchmaking] Eşleşme seçildi: ${candidates[0].nickname}`);
            return candidates[0];
        }

        console.log(`[Matchmaking] Uygun rakip bulunamadı`);
        return null;
    } catch (error) {
        console.error('Rakip bulma hatası:', error);
        return null;
    }
}
/**
 * Rakibe eşleşme bilgisini gönder
 */
export async function notifyMatch(
    opponentOdId: string,
    battleId: string
): Promise<boolean> {
    try {
        const matchmakingRef = doc(db, 'matchmaking', opponentOdId);
        // Önce dokümanın varlığını kontrol et? Gerek yok, updateDoc hata verir zaten.
        await updateDoc(matchmakingRef, {
            matchedBattleId: battleId
        });
        console.log(`[Matchmaking] Rakip bilgilendirildi: ${opponentOdId} -> ${battleId}`);
        return true;
    } catch (error: any) {
        if (error.code === 'not-found' || error.message.includes('No document to update')) {
            console.log(`[Matchmaking] Rakip bulunamadı (Başka bir maçta veya kuyruktan çıkmış): ${opponentOdId}`);
        } else {
            console.error('Rakip bilgilendirme hatası:', error);
        }
        return false;
    }
}

/**
 * Matchmaking durumunu dinle
 */
export function listenToMatchmaking(
    odId: string,
    onMatch: (battleId: string) => void,
    onError: (error: any) => void
): () => void {
    const matchmakingRef = doc(db, 'matchmaking', odId);

    return onSnapshot(matchmakingRef, (snapshot) => {
        const data = snapshot.data();
        if (data?.matchedBattleId) {
            onMatch(data.matchedBattleId);
        }
    }, onError);
}

// ===============================
//  ARKADALA SAVA (ODA SİSTEMİ)
// ===============================

/**
 * Benzersiz oda kodu oluştur
 */
function generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Yeni savaş odası oluştur
 */
export async function createBattleRoom(
    hostId: string,
    hostNickname: string,
    questions: BattleQuestion[]
): Promise<{ roomCode: string; battleId: string }> {
    try {
        const roomCode = generateRoomCode();
        const battleId = `battle_${hostId}_${Date.now()}`;

        const battleRef = doc(db, 'battles', battleId);
        const roomData: BattleRoom = {
            id: battleId,
            roomCode,
            hostId,
            hostNickname,
            guestId: null,
            guestNickname: null,
            status: 'waiting',
            questions,
            hostScore: 0,
            guestScore: 0,
            hostProgress: 0,
            guestProgress: 0,
            hostLastActiveAt: serverTimestamp(),
            guestLastActiveAt: null,
            hostDisconnected: false,
            guestDisconnected: false,
            createdAt: serverTimestamp(),
            startedAt: null,
            finishedAt: null,
            winnerId: null,
        };

        await setDoc(battleRef, roomData);

        // Oda kodunu ayrı koleksiyonda da kaydet (hızlı arama için)
        const roomCodeRef = doc(db, 'roomCodes', roomCode);
        await setDoc(roomCodeRef, { battleId, createdAt: serverTimestamp() });

        return { roomCode, battleId };
    } catch (error) {
        console.error('Oda oluşturma hatası:', error);
        throw error;
    }
}

/**
 * Heartbeat güncelle - Oyuncu aktif olduğunu bildir
 */
export async function updateBattleHeartbeat(
    battleId: string,
    odId: string,
    isHost: boolean
): Promise<void> {
    try {
        const battleRef = doc(db, 'battles', battleId);
        if (isHost) {
            await updateDoc(battleRef, {
                hostLastActiveAt: serverTimestamp(),
                hostDisconnected: false,
            });
        } else {
            await updateDoc(battleRef, {
                guestLastActiveAt: serverTimestamp(),
                guestDisconnected: false,
            });
        }
    } catch (error: any) {
        // Ignore specific race condition errors (benign)
        if (error.code === 'failed-precondition' || error.message?.includes('failed-precondition')) {
            return;
        }
        console.error('Heartbeat güncelleme hatası:', error);
    }
}

/**
 * Oyuncunun çıktığını bildir
 */
export async function markPlayerDisconnected(
    battleId: string,
    isHost: boolean
): Promise<void> {
    try {
        const battleRef = doc(db, 'battles', battleId);
        if (isHost) {
            await updateDoc(battleRef, {
                hostDisconnected: true,
                status: 'abandoned',
            });
        } else {
            await updateDoc(battleRef, {
                guestDisconnected: true,
                status: 'abandoned',
            });
        }
    } catch (error) {
        console.error('Disconnect bildirim hatası:', error);
    }
}

/**
 * Oyuncu savaşı terk etti (Kasıtlı Çıkış)
 */
export async function abandonBattle(
    battleId: string,
    odId: string,
    isHost: boolean
): Promise<void> {
    try {
        const battleRef = doc(db, 'battles', battleId);
        // Terk eden kaybeder, diğeri kazanır
        // Kalan kişinin ID'sini bulmak için store'daki state kullanılabilir ama 
        // burada server-side logic daha güvenli olurdu. imdilik basitleştiriyoruz.

        await updateDoc(battleRef, {
            status: 'abandoned',
            winnerId: isHost ? null : odId, // Host çıktıysa Guest kazanır (ama ID burada yok, Client biliyor)
            // Aslında winnerId set etmemek daha iyi, 'abandonedBy' field ekleyelim:
            abandonedBy: odId,
            finishedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Savaş terk etme hatası:', error);
    }
}

/**
 * Oda koduna göre savaşa katıl
 */
export async function joinBattleRoom(
    roomCode: string,
    guestId: string,
    guestNickname: string
): Promise<{ success: boolean; battleId?: string; battleData?: any; error?: string }> {
    try {
        // Oda kodunu bul
        const roomCodeRef = doc(db, 'roomCodes', roomCode.toUpperCase());
        const roomCodeSnap = await getDoc(roomCodeRef);

        if (!roomCodeSnap.exists()) {
            return { success: false, error: 'Oda bulunamadı' };
        }

        const { battleId } = roomCodeSnap.data();
        const battleRef = doc(db, 'battles', battleId);
        const battleSnap = await getDoc(battleRef);

        if (!battleSnap.exists()) {
            return { success: false, error: 'Savaş bulunamadı' };
        }

        const battleData = battleSnap.data() as BattleRoom;

        if (battleData.status !== 'waiting') {
            return { success: false, error: 'Bu oda artık müsait değil' };
        }

        if (battleData.hostId === guestId) {
            return { success: false, error: 'Kendi odana katılamazsın' };
        }

        // Odaya katıl
        await updateDoc(battleRef, {
            guestId,
            guestNickname,
            guestLastActiveAt: serverTimestamp(),
            guestDisconnected: false,
            status: 'ready',
        });

        // Return battle data so guest can set it to store
        return {
            success: true,
            battleId,
            battleData: {
                questions: battleData.questions,
                hostId: battleData.hostId,
                hostNickname: battleData.hostNickname,
            }
        };
    } catch (error: any) {
        console.error('Odaya katılma hatası:', error);
        return { success: false, error: error.message || 'Katılım başarısız' };
    }
}

// ===============================
// ⚔ SAVA İLEMLERİ
// ===============================

/**
 * Savaşı dinle (gerçek zamanlı güncellemeler)
 */
export function listenToBattle(
    battleId: string,
    onUpdate: (battle: BattleRoom) => void,
    onError: (error: any) => void
): () => void {
    const battleRef = doc(db, 'battles', battleId);

    return onSnapshot(battleRef, (snapshot) => {
        if (snapshot.exists()) {
            onUpdate({ id: snapshot.id, ...snapshot.data() } as BattleRoom);
        }
    }, onError);
}

/**
 * 🔄 Get fresh battle data (for final result - avoids stale cache)
 * This fetches the LATEST data directly from Firestore, not from cache
 */
export async function getBattleFresh(battleId: string): Promise<BattleRoom | null> {
    try {
        const battleRef = doc(db, 'battles', battleId);
        const snapshot = await getDoc(battleRef);
        if (snapshot.exists()) {
            return { id: snapshot.id, ...snapshot.data() } as BattleRoom;
        }
        return null;
    } catch (error) {
        console.error('[Battle] getBattleFresh error:', error);
        return null;
    }
}

/**
 *  Savaş sırasında emoji gönder
 */
export async function sendBattleEmoji(
    battleId: string,
    senderId: string,
    emoji: string
): Promise<void> {
    try {
        const battleRef = doc(db, 'battles', battleId);
        await updateDoc(battleRef, {
            lastEmoji: {
                senderId,
                emoji,
                timestamp: Date.now(),
            },
        });
    } catch (error) {
        console.error('[Battle] sendBattleEmoji error:', error);
    }
}

/**
 * Savaşı başlat
 */
export async function startBattle(battleId: string): Promise<void> {
    try {
        const battleRef = doc(db, 'battles', battleId);
        await updateDoc(battleRef, {
            status: 'inProgress',
            startedAt: serverTimestamp(),
            // Initialize heartbeat timestamps to avoid immediate deadswitch trigger
            hostLastActiveAt: serverTimestamp(),
            guestLastActiveAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Savaş başlatma hatası:', error);
    }
}



/**
 * Skor güncelle (gerçek zamanlı)
 */
export async function updateBattleProgress(
    battleId: string,
    odId: string,
    isHost: boolean,
    score: number,
    progress: number
): Promise<void> {
    try {
        const battleRef = doc(db, 'battles', battleId);

        if (isHost) {
            await updateDoc(battleRef, {
                hostScore: score,
                hostProgress: progress,
            });
        } else {
            await updateDoc(battleRef, {
                guestScore: score,
                guestProgress: progress,
            });
        }
    } catch (error) {
        console.error('İlerleme güncelleme hatası:', error);
    }
}

/**
 * 🔒 ATOMIC ANSWER SUBMISSION
 * Server-authoritative scoring with duplicate prevention
 * This is the SINGLE SOURCE OF TRUTH for battle scoring
 */
export interface SubmitAnswerResult {
    success: boolean;
    isCorrect: boolean;
    newScore: number;
    error?: string;
    message?: string; // For info like ALREADY_ANSWERED
}

export async function submitAnswer(
    battleId: string,
    odId: string,
    isHost: boolean,
    questionIndex: number,
    selectedAnswer: string,
    timeMs: number
): Promise<SubmitAnswerResult> {

    const battleRef = doc(db, 'battles', battleId);

    let attempt = 0;
    while (attempt < 5) {
        try {
            const result = await runTransaction(db, async (transaction) => {
                const battleDoc = await transaction.get(battleRef);

                if (!battleDoc.exists()) {
                    throw new Error('BATTLE_NOT_FOUND');
                }

                const battle = battleDoc.data() as BattleRoom;

                // 1. 📖 STRICT PRE-READ (Reads MUST define before Writes)
                const hostRef = doc(db, 'users', battle.hostId);
                const hostDoc = await transaction.get(hostRef);

                let guestRef: any = null;
                let guestDoc: any = null;
                if (battle.guestId) {
                    guestRef = doc(db, 'users', battle.guestId);
                    guestDoc = await transaction.get(guestRef);
                }

                // Check battle status
                // DEADLOCK/RACE CONDITION FIX: Allow late submissions immediately after finish
                // This covers the case where Player A forces finish, but Player B's answer arrives 100ms later.
                const isFinished = battle.status === 'finished';
                const finishedAtMillis = battle.finishedAt ? (battle.finishedAt as any).toMillis?.() || Date.now() : 0;
                const timeSinceFinish = Date.now() - finishedAtMillis;
                const isRecentFinish = isFinished && timeSinceFinish < 10000; // 10 seconds grace period

                if (battle.status !== 'inProgress' && !isRecentFinish) {
                    throw new Error('BATTLE_NOT_ACTIVE');
                }

                // Duplicate answer prevention and Key Definitions
                const answeredKey = isHost ? 'hostAnswered' : 'guestAnswered';
                const scoreKey = isHost ? 'hostScore' : 'guestScore';
                const progressKey = isHost ? 'hostProgress' : 'guestProgress';
                const answersKey = isHost ? 'hostAnswers' : 'guestAnswers';

                const existingAnswers = battle[answersKey] || [];
                const alreadyAnswered = battle[answeredKey] || [];

                if (alreadyAnswered.includes(questionIndex)) {
                    // DEADLOCK FIX: Check if game should be finished even if I already answered
                    const totalQ = battle.questions.length;
                    const myProg = questionIndex + 1;
                    const oppProgKey = isHost ? 'guestProgress' : 'hostProgress';
                    const oppAnsKey = isHost ? 'guestAnswers' : 'hostAnswers'; // Fallback check

                    const oppProg = battle[oppProgKey] || 0;
                    const oppAnsLen = (battle[oppAnsKey] || []).length;

                    // FALLBACK: Trust answers array length if progress count lags
                    const effectiveOppProg = Math.max(oppProg, oppAnsLen);

                    console.log(`[Battle] 🛡 Duplicate Check Debug - MyProg: ${myProg}, OppProg: ${oppProg}, OppAnsLen: ${oppAnsLen}, Total: ${totalQ}, Status: ${battle.status}`);

                    if (myProg >= totalQ && effectiveOppProg >= totalQ) {
                        console.log('[Battle] 🛡️ Deadlock detected (Both finished), forcing FINISH...');

                        console.log('[Battle] 🛡️ Deadlock detected (Both finished), forcing FINISH...');

                        // RECAlCULATE SCORES FROM ANSWERS (Source of Truth)
                        const calculateScore = (answers: AnswerRecord[]) => (answers || []).filter(a => a.isCorrect).length * 100;

                        const hAnswers = isHost ? (existingAnswers || []) : (battle.hostAnswers || []);
                        const gAnswers = isHost ? (battle.guestAnswers || []) : (existingAnswers || []);

                        // We must include the CURRENT answer if it's not in the list yet (for the person submitting)
                        // But wait, we are in 'alreadyAnswered' block, so it IS in the list?
                        // If it's in 'alreadyAnswered', it should be in 'answers'.
                        // Let's trust 'battle.hostAnswers' vs 'battle.guestAnswers' directly from DB.

                        let hScore = calculateScore(battle.hostAnswers || []);
                        let gScore = calculateScore(battle.guestAnswers || []);

                        // Fallback to stored score if answers are missing for some reason
                        if (hScore === 0 && (battle.hostScore || 0) > 0) hScore = battle.hostScore;
                        if (gScore === 0 && (battle.guestScore || 0) > 0) gScore = battle.guestScore;

                        const hostNick = hostDoc.exists() ? (hostDoc.data() as BattleUser).nickname : 'Host';
                        const guestNick = (guestDoc && guestDoc.exists()) ? (guestDoc.data() as BattleUser).nickname : 'Guest';

                        console.log(`[Battle] 🧮 Recalculated Scores - ${hostNick} (Host): ${hScore}, ${guestNick} (Guest): ${gScore}`);

                        let wId = null;
                        if (hScore > gScore) wId = battle.hostId;
                        else if (gScore > hScore) wId = battle.guestId;

                        const oldWinnerId = battle.winnerId;
                        const winnerChanged = oldWinnerId !== wId;
                        const isLateUpdate = battle.status === 'finished';

                        const finishUpdates = {
                            status: 'finished',
                            winnerId: wId,
                            finishedAt: serverTimestamp(),
                            // Fix pure scores if they were wrong
                            hostScore: hScore,
                            guestScore: gScore
                        };
                        transaction.update(battleRef, finishUpdates);

                        // 🛡 SIMPLIFICATION: Do NOT update stats in deadlock resolution
                        // Stats will be handled by finishBattleWithRewards after settle delay
                        if (isLateUpdate && winnerChanged) {
                            console.log(`[Battle] ⚖ DEADLOCK RE-EVAL (OldWinner: ${oldWinnerId} -> NewWinner: ${wId}). Skipping stat updates.`);
                        }

                        return { success: true, isCorrect: false, newScore: battle[scoreKey] || 0, message: 'DEADLOCK_RESOLVED' };
                    }

                    console.log(`[Battle]  Duplicate answer ignored (Idempotent): Q${questionIndex}`);
                    return {
                        success: true,
                        isCorrect: false, // Doesn't matter, ignored
                        newScore: battle[scoreKey] || 0,
                        message: 'ALREADY_ANSWERED'
                    };
                }

                // Server-side score calculation (AUTHORITATIVE)
                const question = battle.questions[questionIndex];
                if (!question) {
                    throw new Error('INVALID_QUESTION');
                }

                const isCorrect = selectedAnswer === question.correctAnswer;

                const currentScore = battle[scoreKey] || 0;
                const newScore = currentScore + (isCorrect ? 100 : 0);

                // Record answer for result report
                const newAnswer: AnswerRecord = {
                    questionIndex,
                    wordText: question.wordText,
                    wordId: question.wordId,
                    isCorrect,
                    selectedAnswer,
                    timeMs
                };

                // Atomic update
                const updates: any = {
                    [scoreKey]: newScore,
                    [progressKey]: questionIndex + 1,
                    [answeredKey]: [...alreadyAnswered, questionIndex],
                    [answersKey]: [...existingAnswers, newAnswer],
                    [`${isHost ? 'host' : 'guest'}LastActiveAt`]: serverTimestamp()
                };

                //  GAME OVER CHECK
                const myProgress = questionIndex + 1;
                const oppProgressKey = isHost ? 'guestProgress' : 'hostProgress';
                const opponentProgress = battle[oppProgressKey] || 0;
                const totalQuestions = battle.questions.length;

                // DEADLOCK / LATE ANSWER HANDLING
                const isLateUpdate = battle.status === 'finished'; // Allowed due to Grace Period check above

                if (isLateUpdate || (myProgress >= totalQuestions && opponentProgress >= totalQuestions)) {
                    // Battle Finished (or re-evaluating)!

                    const oldWinnerId = battle.winnerId;

                    let newWinnerId: string | null = null;
                    const finalHostScore = isHost ? newScore : (battle.hostScore || 0);
                    const finalGuestScore = isHost ? (battle.guestScore || 0) : newScore;

                    if (finalHostScore > finalGuestScore) newWinnerId = battle.hostId;
                    else if (finalGuestScore > finalHostScore) newWinnerId = battle.guestId || null;

                    // If winner changed, we must CORRECT the stats
                    const winnerChanged = oldWinnerId !== newWinnerId;

                    const hostNick = hostDoc.exists() ? (hostDoc.data() as BattleUser).nickname : 'Host';
                    const guestNick = (guestDoc && guestDoc.exists()) ? (guestDoc.data() as BattleUser).nickname : 'Guest';

                    console.log(`[Battle]  FINISH CHECK: ${hostNick} (${finalHostScore}) vs ${guestNick} (${finalGuestScore}) -> Winner: ${newWinnerId === battle.hostId ? hostNick : (newWinnerId ? guestNick : 'DRAW')}`);

                    if (isLateUpdate && winnerChanged) {
                        // 🛡 SIMPLIFICATION: Do NOT update stats in late answer transactions
                        // This was causing transaction contention due to winner flip-flopping
                        // Stats will be handled by finishBattleWithRewards after settle delay
                        console.log(`[Battle] ⚖ LATE ANSWER detected (OldWinner: ${oldWinnerId} -> NewWinner: ${newWinnerId}). Skipping stat updates to avoid contention.`);
                    }

                    // Always update current status if not late, or update winnerId if changed
                    if (!isLateUpdate || winnerChanged) {
                        updates['status'] = 'finished';
                        updates['winnerId'] = newWinnerId;
                        if (!isLateUpdate) updates['finishedAt'] = serverTimestamp();

                        // If NOT late update (fresh finish), apply standard stats
                        if (!isLateUpdate) {
                            // ... Standard Stats Logic (Block below) ...
                        }
                    }

                    //  STANDARD STATS CALCULATION (Only for Fresh Finish)
                    if (!isLateUpdate) {
                        if (hostDoc.exists()) {
                            const hostData = hostDoc.data() as BattleUser;
                            const isHostWinner = newWinnerId === battle.hostId;
                            const newCurrentStreak = isHostWinner ? (hostData.currentStreak || 0) + 1 : 0;
                            const newBestStreak = Math.max(hostData.bestStreak || 0, newCurrentStreak);

                            transaction.update(hostRef, {
                                battleWins: increment(isHostWinner ? 1 : 0),
                                battleLosses: increment(newWinnerId && !isHostWinner ? 1 : 0),
                                totalScore: increment(finalHostScore),
                                currentStreak: newCurrentStreak,
                                bestStreak: newBestStreak
                            });
                        }

                        if (battle.guestId) {
                            if (guestDoc && guestDoc.exists()) {
                                const guestData = guestDoc.data() as BattleUser;
                                const isGuestWinner = newWinnerId === battle.guestId;
                                const newCurrentStreak = isGuestWinner ? (guestData.currentStreak || 0) + 1 : 0;
                                const newBestStreak = Math.max(guestData.bestStreak || 0, newCurrentStreak);

                                transaction.update(guestRef, {
                                    battleWins: increment(isGuestWinner ? 1 : 0),
                                    battleLosses: increment(newWinnerId && !isGuestWinner ? 1 : 0),
                                    totalScore: increment(finalGuestScore),
                                    currentStreak: newCurrentStreak,
                                    bestStreak: newBestStreak
                                });
                            }
                        }
                    }
                }

                transaction.update(battleRef, updates);
                console.log(`[Battle] ✅ Answer submitted: Q${questionIndex}, Correct: ${isCorrect}, Score: ${newScore}`);
                return { isCorrect, newScore };
            });

            return {
                success: true,
                isCorrect: result.isCorrect,
                newScore: result.newScore
            };

        } catch (error: any) {
            // RETRY LOGIC for Contention
            const isContention = error.code === 'aborted' || error.code === 'failed-precondition' || (error.message && error.message.includes('match the required base version'));

            if (isContention && attempt < 4) {
                attempt++;
                const delay = Math.random() * 500 * attempt;
                console.warn(`[Battle] ⚠ Contention detected, retrying (${attempt}/5)...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            if (error.message === 'BATTLE_NOT_ACTIVE') {
                console.log('[Battle]  Submit skipped: Battle not active');
            } else {
                console.error('[Battle]  Submit answer error:', error.message);
            }
            return {
                success: false,
                isCorrect: false,
                newScore: 0,
                error: error.message
            };
        }
    }

    return { success: false, isCorrect: false, newScore: 0, message: 'MAX_RETRIES_EXCEEDED' };
}


/**
 * 🚪 DISCONNECT HANDLING
 * Awards automatic win to remaining player
 */
export async function handleDisconnect(
    battleId: string,
    disconnectedOdId: string,
    disconnectedIsHost: boolean
): Promise<{ winnerId: string | null }> {
    const battleRef = doc(db, 'battles', battleId);

    try {
        const battleDoc = await getDoc(battleRef);
        if (!battleDoc.exists()) {
            return { winnerId: null };
        }

        const battle = battleDoc.data() as BattleRoom;

        // Determine winner (the one who didn't disconnect)
        const winnerId = disconnectedIsHost ? battle.guestId : battle.hostId;

        await updateDoc(battleRef, {
            status: 'abandoned',
            winnerId,
            finishedAt: serverTimestamp(),
            [disconnectedIsHost ? 'hostDisconnected' : 'guestDisconnected']: true
        });

        console.log(`[Battle] 🚪 Disconnect handled: ${disconnectedOdId} left, winner: ${winnerId}`);

        return { winnerId };
    } catch (error) {
        console.error('[Battle] Disconnect handling error:', error);
        return { winnerId: null };
    }
}

/**
 *  FINISH BATTLE WITH REWARDS
 * Calculates winner and distributes trophies
 */
export async function finishBattleWithRewards(
    battleId: string
): Promise<{ winnerId: string | null; hostScore: number; guestScore: number }> {
    const battleRef = doc(db, 'battles', battleId);

    try {
        const result = await runTransaction(db, async (transaction) => {
            // 1. 📖 READ ALL DATA FIRST (Strict Order: Reads before Writes)
            const battleDoc = await transaction.get(battleRef);
            if (!battleDoc.exists()) {
                throw new Error('Battle not found');
            }

            const battle = battleDoc.data() as BattleRoom;

            // Read Host Data
            const hostRef = doc(db, 'users', battle.hostId);
            const hostDoc = await transaction.get(hostRef);

            // Read Guest Data (if exists)
            let guestRef: any = null;
            let guestDoc: any = null;
            if (battle.guestId) {
                guestRef = doc(db, 'users', battle.guestId);
                guestDoc = await transaction.get(guestRef);
            }

            // 🛡 IDEMPOTENCY CHECK: If already finished, return existing result without changes
            if (battle.status === 'finished') {
                return {
                    winnerId: battle.winnerId || null,
                    hostScore: battle.hostScore,
                    guestScore: battle.guestScore,
                    alreadyFinished: true
                };
            }

            // 2. 🧮 LOGIC & CALCULATIONS
            // 🛡 RACE CONDITION FIX: Calculate scores from ANSWERS array (more reliable than raw score fields)
            // Raw scores might be stale due to sync delays, but answers array is always consistent
            const calculateScore = (answers: AnswerRecord[] = []) => answers.filter(a => a.isCorrect).length * 100;

            const hostScoreFromAnswers = calculateScore(battle.hostAnswers);
            const guestScoreFromAnswers = calculateScore(battle.guestAnswers);

            // Use calculated scores, fallback to raw fields only if answers are missing
            const finalHostScore = hostScoreFromAnswers > 0 ? hostScoreFromAnswers : (battle.hostScore || 0);
            const finalGuestScore = guestScoreFromAnswers > 0 ? guestScoreFromAnswers : (battle.guestScore || 0);

            console.log(`[Battle] 🧮 Score Calculation: Host=${finalHostScore} (raw=${battle.hostScore}), Guest=${finalGuestScore} (raw=${battle.guestScore})`);

            // Determine winner using calculated scores
            let winnerId: string | null = null;
            if (finalHostScore > finalGuestScore) {
                winnerId = battle.hostId;
            } else if (finalGuestScore > finalHostScore) {
                winnerId = battle.guestId;
            }
            // winnerId = null means draw

            // 3.  WRITE UPDATES (Strict Order: Writes after Reads)

            // Update battle status (including corrected scores for race condition fix)
            transaction.update(battleRef, {
                status: 'finished',
                winnerId,
                finishedAt: serverTimestamp(),
                // 🛡 Write back calculated scores to ensure consistency
                hostScore: finalHostScore,
                guestScore: finalGuestScore
            });

            // Update user stats (Host)
            if (hostDoc.exists()) {
                const hostData = hostDoc.data() as BattleUser;
                const isHostWinner = winnerId === battle.hostId;

                transaction.update(hostRef, {
                    battleWins: increment(isHostWinner ? 1 : 0),
                    battleLosses: increment(winnerId && !isHostWinner ? 1 : 0),
                    totalScore: increment(finalHostScore)
                });
            }

            // Update user stats (Guest)
            if (guestDoc && guestDoc.exists()) {
                const guestData = guestDoc.data() as BattleUser;
                const isGuestWinner = winnerId === battle.guestId;

                transaction.update(guestRef, {
                    battleWins: increment(isGuestWinner ? 1 : 0),
                    battleLosses: increment(winnerId && !isGuestWinner ? 1 : 0),
                    totalScore: increment(finalGuestScore)
                });
            }

            return {
                winnerId,
                hostScore: finalHostScore,
                guestScore: finalGuestScore,
                alreadyFinished: false
            };
        });

        if (result.alreadyFinished) {
            console.log('[Battle]  Battle was already finished.');
        } else {
            // Cleanup room code (Non-transactional cleanup is fine)
            if ((result as any).roomCode) {
                // ...
            }
            console.log(`[Battle]  Battle finished Transactionally: Winner=${result.winnerId}`);
        }

        return result;

    } catch (error) {
        console.error('[Battle] Finish battle transaction error:', error);
        return { winnerId: null, hostScore: 0, guestScore: 0 };
    }
}

/**
 * Savaşı bitir
 */
export async function finishBattle(
    battleId: string,
    winnerId: string | null // null = berabere
): Promise<void> {
    try {
        const battleRef = doc(db, 'battles', battleId);
        await updateDoc(battleRef, {
            status: 'finished',
            finishedAt: serverTimestamp(),
            winnerId,
        });

        // Oda kodunu temizle
        const battleSnap = await getDoc(battleRef);
        if (battleSnap.exists()) {
            const { roomCode } = battleSnap.data() as BattleRoom;
            if (roomCode) {
                const roomCodeRef = doc(db, 'roomCodes', roomCode);
                await deleteDoc(roomCodeRef);
            }
        }
    } catch (error) {
        console.error('Savaş bitirme hatası:', error);
    }
}

// ===============================
//  LİDERLİK TABLOSU
// ===============================

/**
 * Genel sıralama için kompozit skor hesapla
 */
export function computeGeneralScore(entry: {
    wins?: number;
    streak?: number;
    harvestCount?: number;
    puzzleScore?: number;
    sesyapScore?: number;
    trophies?: number;
    totalPracticeScore?: number;
}): number {
    return (
        (entry.wins || 0) * 50 +
        (entry.harvestCount || 0) * 100 +
        (entry.puzzleScore || 0) * 3 +
        Math.floor((entry.sesyapScore || 0) * 0.5) +
        (entry.trophies || 0) * 5 +
        (entry.totalPracticeScore || 0) * 2 +
        (entry.streak || 0) * 15
    );
}

type LeaderboardType = 'general' | 'battle' | 'harvest' | 'streak' | 'puzzle' | 'sesyap' | 'trophy' | 'wordmatch' | 'fillblank' | 'idioms' | 'yds' | 'wordforms' | 'allpractices';

/**
 * Firestore user dokümanını LeaderboardEntry'ye dönüştür
 */
function mapDocToEntry(data: BattleUser & {
    lifetimeHarvests?: number;
    puzzleScore?: number;
    sesyapScore?: number;
    trophies?: number;
    wordMatchScore?: number;
    fillBlankScore?: number;
    collocationsScore?: number;
    idiomsScore?: number;
    ydsScore?: number;
    wordFormsScore?: number;
    quizComboScore?: number;
    totalPracticeScore?: number;
}): LeaderboardEntry {
    const entry: LeaderboardEntry = {
        odId: data.odId,
        nickname: data.nickname,
        wins: data.battleWins,
        streak: data.bestStreak,
        level: data.level,
        score: data.totalScore,
        harvestCount: data.lifetimeHarvests || 0,
        puzzleScore: data.puzzleScore || 0,
        sesyapScore: data.sesyapScore || 0,
        trophies: data.trophies || 0,
        wordMatchScore: data.wordMatchScore || 0,
        fillBlankScore: data.fillBlankScore || 0,
        collocationsScore: data.collocationsScore || 0,
        idiomsScore: data.idiomsScore || 0,
        ydsScore: data.ydsScore || 0,
        wordFormsScore: data.wordFormsScore || 0,
        quizComboScore: data.quizComboScore || 0,
        totalPracticeScore: data.totalPracticeScore || 0,
    };
    entry.generalScore = computeGeneralScore(entry);
    return entry;
}

/**
 * Liderlik tablosunu getir
 * @param type - LeaderboardType
 */
export async function getLeaderboard(
    type: LeaderboardType = 'general',
    limitCount: number = 50
): Promise<LeaderboardEntry[]> {
    try {
        const usersRef = collection(db, 'users');

        if (type === 'general') {
            // Genel sıralama: daha fazla kullanıcı çek, client-side composite skor hesapla
            const q = query(usersRef, orderBy('totalScore', 'desc'), limit(200));
            const snapshot = await getDocs(q);
            const entries = snapshot.docs.map((doc) => mapDocToEntry(doc.data() as any));
            // Composite skora göre sırala ve limitCount kadar döndür
            entries.sort((a, b) => (b.generalScore || 0) - (a.generalScore || 0));
            return entries.slice(0, limitCount);
        }

        // Sıralama alanını tipe göre belirle
        let sortField = 'battleWins';
        if (type === 'harvest') sortField = 'lifetimeHarvests';
        else if (type === 'streak') sortField = 'bestStreak';
        else if (type === 'puzzle') sortField = 'puzzleScore';
        else if (type === 'sesyap') sortField = 'sesyapScore';
        else if (type === 'trophy') sortField = 'trophies';
        else if (type === 'wordmatch') sortField = 'wordMatchScore';
        else if (type === 'fillblank') sortField = 'fillBlankScore';
        else if (type === 'idioms') sortField = 'idiomsScore';
        else if (type === 'yds') sortField = 'ydsScore';
        else if (type === 'wordforms') sortField = 'wordFormsScore';
        else if (type === 'allpractices') sortField = 'totalPracticeScore';

        const q = query(
            usersRef,
            orderBy(sortField, 'desc'),
            limit(limitCount)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => mapDocToEntry(doc.data() as any));
    } catch (error) {
        console.error('Liderlik tablosu hatası:', error);
        return [];
    }
}

/**
 * Liderlik tablosunu dinle (gerçek zamanlı)
 * @param type - LeaderboardType
 */
export function listenToLeaderboard(
    onUpdate: (entries: LeaderboardEntry[]) => void,
    onError: (error: any) => void,
    limitCount: number = 50,
    type: LeaderboardType = 'general'
): () => void {
    const usersRef = collection(db, 'users');

    if (type === 'general') {
        // Genel sıralama: daha fazla kullanıcı çek, client-side composite skor hesapla
        const q = query(usersRef, orderBy('totalScore', 'desc'), limit(200));
        return onSnapshot(q, (snapshot) => {
            const entries = snapshot.docs.map((doc) => mapDocToEntry(doc.data() as any));
            entries.sort((a, b) => (b.generalScore || 0) - (a.generalScore || 0));
            onUpdate(entries.slice(0, limitCount));
        }, onError);
    }

    // Sıralama alanını tipe göre belirle
    let sortField = 'battleWins';
    if (type === 'harvest') sortField = 'lifetimeHarvests';
    else if (type === 'streak') sortField = 'bestStreak';
    else if (type === 'puzzle') sortField = 'puzzleScore';
    else if (type === 'sesyap') sortField = 'sesyapScore';
    else if (type === 'trophy') sortField = 'trophies';
    else if (type === 'wordmatch') sortField = 'wordMatchScore';
    else if (type === 'fillblank') sortField = 'fillBlankScore';
    else if (type === 'idioms') sortField = 'idiomsScore';
    else if (type === 'yds') sortField = 'ydsScore';
    else if (type === 'wordforms') sortField = 'wordFormsScore';
    else if (type === 'allpractices') sortField = 'totalPracticeScore';

    const q = query(
        usersRef,
        orderBy(sortField, 'desc'),
        limit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
        const entries = snapshot.docs.map((doc) => mapDocToEntry(doc.data() as any));
        onUpdate(entries);
    }, onError);
}

// ===============================
// 🛠 YARDIMCI FONKSİYONLAR
// ===============================

/**
 * Meaning'i quiz için formatla (noktalı virgüllerden virgüle çevir)
 */
function formatMeaningForQuiz(meaning: string): string {
    return meaning.split(';').map(s => s.trim()).join(', ');
}

/**
 * Gerçek kelime havuzundan battle soruları oluştur
 * @param words - Kelime havuzu (farm + pool'dan gelen kelimeler)
 * @param count - Soru sayısı (varsayılan 10)
 */
export function generateBattleQuestions(
    words: Array<{ id?: string; text: string; meaning: string; difficulty?: string }>,
    count: number = 10
): BattleQuestion[] {
    // Kelime havuzu boşsa demo sorular döndür
    if (!words || words.length < 10) {
        return generateDemoQuestions();
    }

    // Kelimeleri karıştır
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    const questions: BattleQuestion[] = [];

    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
        const word = shuffled[i];
        const correctAnswer = formatMeaningForQuiz(word.meaning);

        // Yanlış seçenekler için farklı kelimeler al
        const wrongOptions = words
            .filter(w => w.text !== word.text && formatMeaningForQuiz(w.meaning) !== correctAnswer)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3)
            .map(w => formatMeaningForQuiz(w.meaning));

        // Seçenekleri karıştır
        const options = [correctAnswer, ...wrongOptions].sort(() => Math.random() - 0.5);

        questions.push({
            wordId: word.id || word.text,
            wordText: word.text,
            correctAnswer,
            options,
        });
    }

    return questions;
}

/**
 * Demo sorular (kelime havuzu boşsa kullanılır)
 */
function generateDemoQuestions(): BattleQuestion[] {
    const demoWords = [
        { word: 'beautiful', meaning: 'güzel', options: ['güzel', 'çirkin', 'hızlı', 'yavaş'] },
        { word: 'quickly', meaning: 'hızlıca', options: ['yavaşça', 'hızlıca', 'sessizce', 'gürültülü'] },
        { word: 'knowledge', meaning: 'bilgi', options: ['cehalet', 'bilgi', 'şüphe', 'korku'] },
        { word: 'strength', meaning: 'güç', options: ['zayıflık', 'güç', 'hız', 'yavaşlık'] },
        { word: 'wisdom', meaning: 'bilgelik', options: ['bilgelik', 'aptallık', 'gençlik', 'yaşlılık'] },
        { word: 'courage', meaning: 'cesaret', options: ['korkaklık', 'cesaret', 'utangaçlık', 'şüphe'] },
        { word: 'patience', meaning: 'sabır', options: ['sabır', 'acele', 'öfke', 'mutluluk'] },
        { word: 'freedom', meaning: 'özgürlük', options: ['esaret', 'özgürlük', 'bağımlılık', 'zorunluluk'] },
        { word: 'happiness', meaning: 'mutluluk', options: ['üzüntü', 'mutluluk', 'korku', 'endişe'] },
        { word: 'success', meaning: 'başarı', options: ['başarısızlık', 'başarı', 'deneme', 'şans'] },
    ];

    return demoWords.map((w) => ({
        wordId: w.word,
        wordText: w.word,
        correctAnswer: w.meaning,
        options: w.options.sort(() => Math.random() - 0.5),
    }));
}

// ===============================
// 📚 PRATİK MERKEZİ SKOR GÜNCELLEME
// ===============================

export type PracticeType = 'wordmatch' | 'fillblank' | 'collocations' | 'idioms' | 'yds' | 'wordforms';

const PRACTICE_SCORE_FIELDS: Record<PracticeType, string> = {
    wordmatch: 'wordMatchScore',
    fillblank: 'fillBlankScore',
    collocations: 'collocationsScore',
    idioms: 'idiomsScore',
    yds: 'ydsScore',
    wordforms: 'wordFormsScore',
};

const MAX_PRACTICE_SCORE_INCREMENT = 100000;
const PRACTICE_LEADERBOARD_MULTIPLIER = 0.25;
const QUIZ_COMBO_LEADERBOARD_MULTIPLIER = 0.5;

/**
 * Pratik Merkezi skorunu güncelle
 * @param odId - Kullanıcı ID
 * @param practiceType - Pratik tipi
 * @param scoreToAdd - Eklenecek puan
 * 
 * Hem ilgili pratik skorunu hem de totalPracticeScore'u günceller
 */
export async function updatePracticeScore(
    odId: string,
    practiceType: PracticeType,
    scoreToAdd: number
): Promise<{ success: boolean; error?: string }> {
    try {
        const safeOdId = typeof odId === 'string' ? odId.trim() : '';
        if (!safeOdId) {
            return { success: false, error: 'Gecersiz kullanici' };
        }

        const field = PRACTICE_SCORE_FIELDS[practiceType];
        if (!field) {
            return { success: false, error: 'Gecersiz pratik turu' };
        }

        const numericScore = Number.isFinite(scoreToAdd) ? Math.floor(scoreToAdd) : 0;
        if (numericScore <= 0) {
            return { success: true };
        }
        const safeScore = Math.min(numericScore, MAX_PRACTICE_SCORE_INCREMENT);
        const leaderboardScoreDelta = Math.max(
            1,
            Math.round(safeScore * PRACTICE_LEADERBOARD_MULTIPLIER)
        );

        const userRef = doc(db, 'users', safeOdId);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            return { success: false, error: 'Kullanici bulunamadi' };
        }

        // Hem ilgili pratik skorunu hem de toplam pratik skorunu guncelle
        await updateDoc(userRef, {
            [field]: increment(leaderboardScoreDelta),
            totalPracticeScore: increment(leaderboardScoreDelta),
            lastActiveAt: serverTimestamp(),
        });

        return { success: true };
    } catch (error) {
        console.error('Pratik skor guncelleme hatasi:', error);
        return { success: false, error: 'Skor guncellenemedi' };
    }
}

/**
 * Quiz sonucu combo puanını liderlik tablosuna tek seferde yansıt
 * - Liderlik katkısı: combo * 0.5
 * - Genel sıralamada görünmesi için totalPracticeScore ve totalScore da güncellenir
 */
export async function updateQuizComboScore(
    odId: string,
    comboValue: number
): Promise<{ success: boolean; error?: string; applied?: number }> {
    try {
        const safeOdId = typeof odId === 'string' ? odId.trim() : '';
        if (!safeOdId) {
            return { success: false, error: 'Gecersiz kullanici' };
        }

        const numericCombo = Number.isFinite(comboValue) ? Math.floor(comboValue) : 0;
        if (numericCombo <= 0) {
            return { success: true, applied: 0 };
        }

        const safeCombo = Math.min(numericCombo, MAX_PRACTICE_SCORE_INCREMENT);
        const leaderboardScoreDelta = Math.max(
            1,
            Math.round(safeCombo * QUIZ_COMBO_LEADERBOARD_MULTIPLIER)
        );

        const userRef = doc(db, 'users', safeOdId);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
            return { success: false, error: 'Kullanici bulunamadi' };
        }

        await updateDoc(userRef, {
            quizComboScore: increment(leaderboardScoreDelta),
            totalPracticeScore: increment(leaderboardScoreDelta),
            totalScore: increment(leaderboardScoreDelta),
            lastActiveAt: serverTimestamp(),
        });

        return { success: true, applied: leaderboardScoreDelta };
    } catch (error) {
        console.error('Quiz combo skor guncelleme hatasi:', error);
        return { success: false, error: 'Quiz combo skoru guncellenemedi' };
    }
}

/**
 * Pratik Merkezi skorunu getir
 * @param odId - Kullanıcı ID
 * @param practiceType - Pratik tipi
 */
export async function getPracticeScore(
    odId: string,
    practiceType: PracticeType
): Promise<number> {
    try {
        const userRef = doc(db, 'users', odId);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            return 0;
        }

        const data = userDoc.data();
        const fieldMap: Record<PracticeType, string> = {
            wordmatch: 'wordMatchScore',
            fillblank: 'fillBlankScore',
            collocations: 'collocationsScore',
            idioms: 'idiomsScore',
            yds: 'ydsScore',
            wordforms: 'wordFormsScore',
        };

        return data[fieldMap[practiceType]] || 0;
    } catch (error) {
        console.error('Pratik skor getirme hatası:', error);
        return 0;
    }
}

export { db };


