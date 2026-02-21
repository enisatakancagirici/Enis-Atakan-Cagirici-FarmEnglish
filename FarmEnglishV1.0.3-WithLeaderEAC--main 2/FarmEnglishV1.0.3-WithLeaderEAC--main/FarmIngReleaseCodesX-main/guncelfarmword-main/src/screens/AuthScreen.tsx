/**
 * AuthScreen - Firebase ile Kayıt
 * FarmEnglish Battle Mode
 * 
 * Responsive + Benzersiz nickname kontrolü
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
    ScrollView,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Swords, User, Trophy, Shield, ChevronRight, Zap, CheckCircle, XCircle } from 'lucide-react-native';
import { useFarmStore } from '../store/farmStore';
import { haptic } from '../utils/sound';
import { checkNicknameAvailable, registerUser, getUser } from '../utils/firebaseBattle';
import { isNicknameClean } from '../utils/nicknameModeration';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive sistem
const IS_SMALL_DEVICE = SCREEN_HEIGHT < 700;
const RS = {
    logoSize: IS_SMALL_DEVICE ? 70 : 90,
    titleFont: IS_SMALL_DEVICE ? 24 : 28,
    subtitleFont: IS_SMALL_DEVICE ? 13 : 15,
    padding: IS_SMALL_DEVICE ? 16 : 24,
    inputHeight: IS_SMALL_DEVICE ? 48 : 52,
    buttonPadding: IS_SMALL_DEVICE ? 14 : 16,
    featureGap: IS_SMALL_DEVICE ? 8 : 12,
};

interface AuthScreenProps {
    navigation: any;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ navigation }) => {
    const [nickname, setNickname] = useState('');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(false);
    const [nicknameStatus, setNicknameStatus] = useState<'idle' | 'available' | 'taken'>('idle');

    // Store actions
    const setUser = useFarmStore((s) => s.setUser);
    const setIsAuthenticated = useFarmStore((s) => s.setIsAuthenticated);
    const setStoreNickname = useFarmStore((s) => s.setNickname);
    const level = useFarmStore((s) => s.level);
    const existingUser = useFarmStore((s) => s.user);
    const isNicknameCleanSafe = useCallback((value: string): boolean => {
        try {
            if (typeof isNicknameClean !== 'function') return false;
            return isNicknameClean(value);
        } catch (error) {
            return false;
        }
    }, []);

    // Daha önce kayıtlı kullanıcı varsa kontrol et
    useEffect(() => {
        const checkExistingUser = async () => {
            if (existingUser?.odId) {
                const user = await getUser(existingUser.odId);
                if (user) {
                    setIsAuthenticated(true);
                    navigation.goBack();
                }
            }
        };
        checkExistingUser();
    }, []);

    // Nickname değiştiğinde kontrol et (debounce ile)
    useEffect(() => {
        const trimmed = nickname.trim();

        if (trimmed.length < 2) {
            setNicknameStatus('idle');
            setChecking(false);
            return;
        }

        if (!isNicknameCleanSafe(trimmed)) {
            setNicknameStatus('taken');
            setChecking(false);
            return;
        }

        setChecking(true);
        const timer = setTimeout(async () => {
            const available = await checkNicknameAvailable(trimmed);
            setNicknameStatus(available ? 'available' : 'taken');
            setChecking(false);
        }, 500);

        return () => clearTimeout(timer);
    }, [nickname, isNicknameCleanSafe]);

    // Kayıt ol
    const handleRegister = useCallback(async () => {
        const trimmedName = nickname.trim();

        if (trimmedName.length < 2) {
            Alert.alert('Hata', 'Takma ad en az 2 karakter olmalı');
            return;
        }

        if (!isNicknameCleanSafe(trimmedName)) {
            Alert.alert('Uygunsuz İsim', 'Bu kullanıcı adı uygunsuz ifade içeriyor. Lütfen farklı bir ad seçin.');
            return;
        }

        if (trimmedName.length > 15) {
            Alert.alert('Hata', 'Takma ad en fazla 15 karakter olabilir');
            return;
        }

        if (nicknameStatus === 'taken') {
            Alert.alert('Hata', 'Bu kullanıcı adı zaten alınmış');
            return;
        }

        setLoading(true);
        haptic.medium();

        const odId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const result = await registerUser(odId, trimmedName, level);

        if (!result.success) {
            setLoading(false);
            Alert.alert('Hata', result.error || 'Kayıt başarısız');
            return;
        }

        setUser({
            odId,
            email: null,
            nickname: trimmedName,
            avatarUrl: null,
        });
        setStoreNickname(trimmedName);
        setIsAuthenticated(true);

        setLoading(false);
        haptic.success();

        Alert.alert(
            '🎉 Hoş Geldin!',
            `${trimmedName}, artık savaş moduna katılabilirsin!`,
            [{ text: 'Hadi Başlayalım!', onPress: () => navigation.goBack() }]
        );
    }, [nickname, nicknameStatus, level, setUser, setStoreNickname, setIsAuthenticated, navigation, isNicknameCleanSafe]);

    const handleBack = useCallback(() => {
        haptic.light();
        navigation.goBack();
    }, [navigation]);

    const isValidNickname = nickname.trim().length >= 2 && nicknameStatus === 'available';

    return (
        <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <KeyboardAvoidingView
                    style={styles.container}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Header */}
                        <View style={styles.header}>
                            <Pressable style={styles.backButton} onPress={handleBack}>
                                <ChevronRight color="#fff" size={22} style={{ transform: [{ rotate: '180deg' }] }} />
                            </Pressable>
                        </View>

                        {/* Logo & Title */}
                        <View style={styles.logoContainer}>
                            <View style={[styles.logoCircle, { width: RS.logoSize, height: RS.logoSize, borderRadius: RS.logoSize / 2 }]}>
                                <Swords color="#8b5cf6" size={RS.logoSize * 0.5} />
                            </View>
                            <Text style={[styles.title, { fontSize: RS.titleFont }]}>Savaşa Katıl!</Text>
                            <Text style={[styles.subtitle, { fontSize: RS.subtitleFont }]}>
                                Takma adını seç ve rakiplerle yarışmaya başla
                            </Text>
                        </View>

                        {/* Features */}
                        <View style={[styles.featuresContainer, { gap: RS.featureGap }]}>
                            <View style={styles.featureItem}>
                                <Trophy color="#f59e0b" size={16} />
                                <Text style={styles.featureText}>Gerçek zamanlı yarış</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <Shield color="#22c55e" size={16} />
                                <Text style={styles.featureText}>Liderlik tablosu</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <Zap color="#8b5cf6" size={16} />
                                <Text style={styles.featureText}>Arkadaşla savaş</Text>
                            </View>
                        </View>

                        {/* Registration Form */}
                        <View style={[styles.formContainer, { paddingHorizontal: RS.padding }]}>
                            <Text style={styles.inputLabel}>Takma Adın</Text>
                            <View style={[
                                styles.inputWrapper,
                                { height: RS.inputHeight },
                                nicknameStatus === 'available' && styles.inputWrapperValid,
                                nicknameStatus === 'taken' && styles.inputWrapperInvalid,
                            ]}>
                                <User color="rgba(255,255,255,0.5)" size={18} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Örn: QuizMaster"
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    value={nickname}
                                    onChangeText={setNickname}
                                    maxLength={15}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    editable={!loading}
                                />
                                {checking && <ActivityIndicator size="small" color="#8b5cf6" />}
                                {!checking && nicknameStatus === 'available' && <CheckCircle color="#22c55e" size={18} />}
                                {!checking && nicknameStatus === 'taken' && <XCircle color="#ef4444" size={18} />}
                            </View>

                            <View style={styles.inputFooter}>
                                <Text style={styles.charCount}>{nickname.length}/15</Text>
                                {nicknameStatus === 'taken' && <Text style={styles.errorText}>Bu isim alınmış</Text>}
                                {nicknameStatus === 'available' && <Text style={styles.successText}>Kullanılabilir ✓</Text>}
                            </View>

                            {/* Register Button */}
                            <Pressable
                                style={[styles.registerButton, !isValidNickname && styles.registerButtonDisabled]}
                                onPress={handleRegister}
                                disabled={loading || !isValidNickname}
                            >
                                <LinearGradient
                                    colors={isValidNickname ? ['#8b5cf6', '#6d28d9'] : ['#374151', '#1f2937']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={[styles.registerButtonGradient, { paddingVertical: RS.buttonPadding }]}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <>
                                            <Swords color="#fff" size={18} />
                                            <Text style={styles.registerButtonText}>Savaşa Başla!</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </Pressable>

                            {/* Info */}
                            <View style={styles.infoBox}>
                                <Text style={styles.infoText}>
                                    💡 Takma adın liderlik tablosunda gösterilecek
                                </Text>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 24,
    },
    header: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        paddingVertical: IS_SMALL_DEVICE ? 16 : 24,
    },
    logoCircle: {
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        borderWidth: 2,
        borderColor: 'rgba(139, 92, 246, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: IS_SMALL_DEVICE ? 12 : 16,
    },
    title: {
        fontWeight: '900',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 6,
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
        paddingHorizontal: 32,
    },
    featuresContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        marginBottom: IS_SMALL_DEVICE ? 16 : 24,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
    },
    featureText: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '600',
    },
    formContainer: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        paddingHorizontal: 14,
        gap: 10,
    },
    inputWrapperValid: {
        borderColor: 'rgba(34, 197, 94, 0.5)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
    },
    inputWrapperInvalid: {
        borderColor: 'rgba(239, 68, 68, 0.5)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#ffffff',
        fontWeight: '600',
    },
    inputFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    charCount: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.4)',
    },
    errorText: {
        fontSize: 11,
        color: '#ef4444',
        fontWeight: '600',
    },
    successText: {
        fontSize: 11,
        color: '#22c55e',
        fontWeight: '600',
    },
    registerButton: {
        marginTop: 16,
        borderRadius: 12,
        overflow: 'hidden',
    },
    registerButtonDisabled: {
        opacity: 0.6,
    },
    registerButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    registerButtonText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#ffffff',
    },
    infoBox: {
        marginTop: 16,
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.3)',
    },
    infoText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
    },
});

export default AuthScreen;
