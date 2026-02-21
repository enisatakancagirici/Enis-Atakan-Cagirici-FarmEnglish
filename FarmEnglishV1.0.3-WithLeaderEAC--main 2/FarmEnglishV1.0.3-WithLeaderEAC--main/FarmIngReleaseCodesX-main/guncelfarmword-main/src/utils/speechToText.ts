/**
 * 🎤 Speech to Text Utility - Google Cloud Speech-to-Text API
 * Expo Go uyumlu: expo-av ile kayıt + Cloud API
 */

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

// 🔧 Google Cloud Speech-to-Text API endpoint
const GOOGLE_SPEECH_API = 'https://speech.googleapis.com/v1/speech:recognize';

// ⚠️ API Key - production'da environment variable kullanın
// Free tier: 60 dakika/ay ücretsiz
const GOOGLE_API_KEY = 'AIzaSyC2NX5MV1Wlnj-GCSfPXDVjczgoONJG41w';

interface SpeechRecognitionResult {
    transcript: string;
    confidence: number;
    error?: string;
}

interface RecordingState {
    recording: Audio.Recording | null;
    uri: string | null;
}

export type MicrophonePermissionState = {
    granted: boolean;
    canAskAgain: boolean;
    status: string;
};

let recordingState: RecordingState = {
    recording: null,
    uri: null,
};

/**
 * Mikrofon izin durumunu oku (prompt tetiklemez)
 */
export async function getMicrophonePermissionState(): Promise<MicrophonePermissionState> {
    try {
        const permission = await Audio.getPermissionsAsync();
        return {
            granted: permission.status === 'granted',
            canAskAgain: !!permission.canAskAgain,
            status: permission.status,
        };
    } catch {
        return {
            granted: false,
            canAskAgain: false,
            status: 'denied',
        };
    }
}

/**
 * Mikrofon izni iste (sistem promptu)
 */
export async function requestMicrophonePermission(): Promise<MicrophonePermissionState> {
    try {
        const permission = await Audio.requestPermissionsAsync();
        return {
            granted: permission.status === 'granted',
            canAskAgain: !!permission.canAskAgain,
            status: permission.status,
        };
    } catch {
        return {
            granted: false,
            canAskAgain: false,
            status: 'denied',
        };
    }
}

/**
 * 🎙️ Mikrofon izni iste ve kayıt başlat
 */
export async function startRecording(): Promise<boolean> {
    try {
        // 🧹 Önceki kaydı temizle (eğer varsa)
        if (recordingState.recording) {
            try {
                const status = await recordingState.recording.getStatusAsync();
                if (status.isRecording || status.canRecord) {
                    await recordingState.recording.stopAndUnloadAsync();
                }
            } catch (e) {
                // Görmezden gel
            }
            recordingState.recording = null;
        }

        // 🔄 Audio mode'u resetle
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: false,
        });

        // İzin kontrolü (prompt göstermeden)
        const permission = await Audio.getPermissionsAsync();
        if (permission.status !== 'granted') {
            return false;
        }

        // Audio modu ayarla
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
        });

        // Yeni kayıt oluştur - LINEAR16 format + Metering aktif
        const { recording } = await Audio.Recording.createAsync(
            {
                android: {
                    extension: '.wav',
                    outputFormat: Audio.AndroidOutputFormat.DEFAULT,
                    audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
                    sampleRate: 16000,
                    numberOfChannels: 1,
                    bitRate: 256000,
                },
                ios: {
                    extension: '.wav',
                    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
                    audioQuality: Audio.IOSAudioQuality.HIGH,
                    sampleRate: 16000,
                    numberOfChannels: 1,
                    bitRate: 256000,
                    linearPCMBitDepth: 16,
                    linearPCMIsBigEndian: false,
                    linearPCMIsFloat: false,
                },
                web: {
                    mimeType: 'audio/wav',
                    bitsPerSecond: 256000,
                },
            },
            undefined,
            100 // 🔊 Metering update interval (100ms)
        );

        recordingState.recording = recording;
        return true;
    } catch (error) {
        // Hata durumunda state'i temizle
        recordingState.recording = null;
        return false;
    }
}

/**
 * 🔊 Kayıt durumunu al (ses seviyesi için)
 * metering: -160 (sessiz) ile 0 (çok yüksek) arası dB değeri
 */
export async function getRecordingStatus(): Promise<{ isRecording: boolean; metering: number } | null> {
    try {
        if (!recordingState.recording) {
            return null;
        }
        const status = await recordingState.recording.getStatusAsync();
        return {
            isRecording: status.isRecording,
            metering: status.metering ?? -160,
        };
    } catch (error) {
        return null;
    }
}

/**
 * 🛑 Kaydı durdur ve dosya URI'sini al
 */
export async function stopRecording(): Promise<string | null> {
    try {
        if (!recordingState.recording) {
            return null;
        }

        await recordingState.recording.stopAndUnloadAsync();
        const uri = recordingState.recording.getURI();
        recordingState.uri = uri;
        recordingState.recording = null;

        return uri;
    } catch (error) {
        return null;
    }
}

/**
 * 🧹 Kayıt dosyasını sil (privacy için)
 */
export async function deleteRecording(): Promise<void> {
    try {
        if (recordingState.uri) {
            await FileSystem.deleteAsync(recordingState.uri, { idempotent: true });
            recordingState.uri = null;
        }
    } catch (error) {
    }
}

/**
 * 🌐 Ses dosyasını Google Cloud Speech-to-Text API'ye gönder
 */
export async function transcribeAudio(audioUri: string): Promise<SpeechRecognitionResult> {
    try {
        // Dosyayı base64'e çevir
        const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        // Google Cloud Speech-to-Text API isteği
        const response = await fetch(`${GOOGLE_SPEECH_API}?key=${GOOGLE_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                config: {
                    encoding: 'LINEAR16',
                    sampleRateHertz: 16000,
                    languageCode: 'en-US', // İngilizce
                    enableAutomaticPunctuation: true,
                    model: 'default',
                },
                audio: {
                    content: base64Audio,
                },
            }),
        });

        const data = await response.json();

        // 🔍 DEBUG: API yanıtını logla

        if (data.error) {
            return {
                transcript: '',
                confidence: 0,
                error: data.error.message || 'API hatası',
            };
        }

        // Sonuçları parse et
        if (data.results && data.results.length > 0) {
            const firstResult = data.results[0];
            if (firstResult.alternatives && firstResult.alternatives.length > 0) {
                const bestAlternative = firstResult.alternatives[0];
                return {
                    transcript: bestAlternative.transcript || '',
                    confidence: bestAlternative.confidence || 0.9,
                };
            }
        }

        return {
            transcript: '',
            confidence: 0,
            error: 'Ses tanınamadı - daha uzun konuşun',
        };
    } catch (error) {
        return {
            transcript: '',
            confidence: 0,
            error: error instanceof Error ? error.message : 'Bilinmeyen hata',
        };
    }
}

/**
 * 🎤 Tam akış: Kaydet, transkript al, temizle
 */
export async function recordAndTranscribe(): Promise<SpeechRecognitionResult> {
    const uri = await stopRecording();

    if (!uri) {
        return {
            transcript: '',
            confidence: 0,
            error: 'Kayıt alınamadı',
        };
    }

    const result = await transcribeAudio(uri);

    // Privacy için kayıt dosyasını sil
    await deleteRecording();

    return result;
}
