/**
 * Firebase Configuration & Services
 * FarmEnglish Battle Mode
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCredential, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  OAuthProvider,
  GoogleAuthProvider,
  Auth
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  Firestore,
  Timestamp
} from 'firebase/firestore';

// Firebase config (from GoogleService-Info.plist)
const firebaseConfig = {
  apiKey: "AIzaSyBN_-fg6G4l0CJhEJKCUEVx-2cExQmw3pY",
  authDomain: "farmenglish-1919.firebaseapp.com",
  projectId: "farmenglish-1919",
  storageBucket: "farmenglish-1919.firebasestorage.app",
  messagingSenderId: "519253828806",
  appId: "1:519253828806:ios:50b252f914bc03b729e3c7"
};

// Initialize Firebase (singleton pattern)
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

export const initializeFirebase = () => {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  auth = getAuth(app);
  db = getFirestore(app);
  return { app, auth, db };
};

// Ensure Firebase is initialized
const ensureInitialized = () => {
  if (!app) {
    initializeFirebase();
  }
  return { auth, db };
};

// ===============================
// AUTH HELPERS
// ===============================

export interface UserProfile {
  odId: string;
  nickname: string;
  email?: string;
  avatarUrl?: string;
  level: number;
  xp: number;
  coins: number;
  streak?: number; // 🔥 Günlük giriş serisi
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  battleStats: {
    wins: number;
    losses: number;
    bestStreak: number;
    bestCombo: number;
    totalBattles: number;
  };
}

/**
 * Sign in with Apple credential
 */
export const signInWithApple = async (identityToken: string, nonce: string): Promise<User> => {
  const { auth } = ensureInitialized();
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: identityToken,
    rawNonce: nonce,
  });
  const result = await signInWithCredential(auth, credential);
  return result.user;
};

/**
 * Sign in with Google credential
 */
export const signInWithGoogle = async (idToken: string): Promise<User> => {
  const { auth } = ensureInitialized();
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  return result.user;
};

/**
 * Sign out current user
 */
export const signOut = async (): Promise<void> => {
  const { auth } = ensureInitialized();
  await firebaseSignOut(auth);
};

/**
 * Get current user
 */
export const getCurrentUser = (): User | null => {
  const { auth } = ensureInitialized();
  return auth.currentUser;
};

/**
 * Listen to auth state changes
 */
export const onAuthChange = (callback: (user: User | null) => void) => {
  const { auth } = ensureInitialized();
  return onAuthStateChanged(auth, callback);
};

// ===============================
// USER PROFILE
// ===============================

/**
 * Create or update user profile in Firestore
 */
export const createOrUpdateUserProfile = async (
  userId: string, 
  data: Partial<UserProfile>
): Promise<void> => {
  const { db } = ensureInitialized();
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  
  if (userDoc.exists()) {
    await updateDoc(userRef, {
      ...data,
      lastLoginAt: serverTimestamp(),
    });
  } else {
    await setDoc(userRef, {
      odId: userId,
      nickname: data.nickname || `Player${userId.slice(0, 6)}`,
      level: 1,
      xp: 0,
      coins: 0,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      battleStats: {
        wins: 0,
        losses: 0,
        bestStreak: 0,
        bestCombo: 0,
        totalBattles: 0,
      },
      ...data,
    });
  }
};

/**
 * Get user profile
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const { db } = ensureInitialized();
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  return userDoc.exists() ? (userDoc.data() as UserProfile) : null;
};

// ===============================
// BATTLE MATCHMAKING
// ===============================

export interface MatchmakingRequest {
  odId: string;
  odName: string;
  level: number;
  createdAt: Timestamp;
}

export interface Battle {
  id: string;
  players: string[];
  playerInfo: Record<string, { nickname: string; level: number }>;
  status: 'waiting' | 'active' | 'completed';
  questionSetId: string;
  questions: BattleQuestion[];
  scores: Record<string, number>;
  currentRound: number;
  rounds: BattleRound[];
  winnerId: string | null;
  createdAt: Timestamp;
  completedAt: Timestamp | null;
}

export interface BattleQuestion {
  wordId: string;
  wordText: string;
  correctAnswer: string;
  options: string[];
}

export interface BattleRound {
  odId: string;
  questionIndex: number;
  correct: boolean;
  timeMs: number;
  answeredAt: Timestamp;
}

/**
 * Join matchmaking queue
 */
export const joinMatchmaking = async (userId: string, nickname: string, level: number): Promise<string> => {
  const { db } = ensureInitialized();
  const queueRef = collection(db, 'matchmaking');
  
  // Check for existing match request
  const q = query(
    queueRef,
    where('status', '==', 'waiting'),
    where('odId', '!=', userId),
    orderBy('odId'),
    orderBy('createdAt'),
    limit(1)
  );
  
  // This is a simplified matchmaking - real implementation would use Cloud Functions
  const docRef = await addDoc(queueRef, {
    odId: userId,
    odName: nickname,
    level,
    status: 'waiting',
    createdAt: serverTimestamp(),
  });
  
  return docRef.id;
};

/**
 * Listen for battle updates
 */
export const listenToBattle = (
  battleId: string, 
  callback: (battle: Battle | null) => void
) => {
  const { db } = ensureInitialized();
  const battleRef = doc(db, 'battles', battleId);
  return onSnapshot(battleRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() } as Battle);
    } else {
      callback(null);
    }
  });
};

/**
 * Submit battle answer
 */
export const submitBattleAnswer = async (
  battleId: string,
  odId: string,
  questionIndex: number,
  correct: boolean,
  timeMs: number
): Promise<void> => {
  const { db } = ensureInitialized();
  const battleRef = doc(db, 'battles', battleId);
  
  // In real implementation, this would be a Cloud Function to prevent cheating
  const roundsRef = collection(db, 'battles', battleId, 'rounds');
  await addDoc(roundsRef, {
    odId,
    questionIndex,
    correct,
    timeMs,
    answeredAt: serverTimestamp(),
  });
};

/**
 * Cancel matchmaking
 */
export const cancelMatchmaking = async (requestId: string): Promise<void> => {
  const { db } = ensureInitialized();
  const requestRef = doc(db, 'matchmaking', requestId);
  await updateDoc(requestRef, { status: 'cancelled' });
};

// ===============================
// LEADERBOARD
// ===============================

export interface LeaderboardEntry {
  odId: string;
  nickname: string;
  wins: number;
  bestStreak: number;
  level: number;
  rank?: number;
}

/**
 * Get weekly leaderboard
 */
export const getWeeklyLeaderboard = async (limitCount: number = 100): Promise<LeaderboardEntry[]> => {
  const { db } = ensureInitialized();
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef,
    orderBy('battleStats.wins', 'desc'),
    limit(limitCount)
  );
  
  // Note: This is a simplified query. Real implementation would use 
  // a dedicated leaderboard collection updated by Cloud Functions
  const snapshot = await getDoc(doc(db, 'leaderboard', 'weekly'));
  if (snapshot.exists()) {
    return snapshot.data().entries as LeaderboardEntry[];
  }
  return [];
};

// Export singleton instances
export { auth, db };
