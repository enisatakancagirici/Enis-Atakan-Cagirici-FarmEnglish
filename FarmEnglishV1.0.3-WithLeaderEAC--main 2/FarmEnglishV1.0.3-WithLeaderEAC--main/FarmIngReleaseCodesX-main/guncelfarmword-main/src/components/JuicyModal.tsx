import React, { memo, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withTiming,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { haptic, sound } from '../utils/sound';

const { width, height } = Dimensions.get('window');

export interface JuicyModalButton {
  text: string;
  onPress: () => void;
  type?: 'default' | 'primary' | 'danger' | 'cancel';
  emoji?: string;
}

export interface JuicyModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  titleEmoji?: string;
  message: string;
  secondaryMessage?: string;
  secondaryEmoji?: string;
  buttons: JuicyModalButton[];
  type?: 'info' | 'success' | 'warning' | 'error' | 'purchase';
}

const JuicyModal: React.FC<JuicyModalProps> = memo(({
  visible,
  onClose,
  title,
  titleEmoji,
  message,
  secondaryMessage,
  secondaryEmoji,
  buttons,
  type = 'info',
}) => {
  // 🎯 Açılışta haptic
  useEffect(() => {
    if (visible) {
      haptic.medium?.();
      sound.playClick?.();
    }
  }, [visible]);

  // 🎨 Type'a göre renkler
  const getTypeColors = () => {
    switch (type) {
      case 'success':
        return { gradient: ['#065f46', '#047857'] as const, accent: '#22c55e' };
      case 'warning':
        return { gradient: ['#78350f', '#92400e'] as const, accent: '#fbbf24' };
      case 'error':
        return { gradient: ['#7f1d1d', '#991b1b'] as const, accent: '#ef4444' };
      case 'purchase':
        return { gradient: ['#1e1b4b', '#312e81'] as const, accent: '#a855f7' };
      default:
        return { gradient: ['#1e293b', '#334155'] as const, accent: '#3b82f6' };
    }
  };

  const { gradient, accent } = getTypeColors();

  // 🎯 Buton renklerine göre stil
  const getButtonStyle = (buttonType: JuicyModalButton['type']) => {
    switch (buttonType) {
      case 'primary':
        return {
          colors: ['#22c55e', '#16a34a'] as const,
          textColor: '#fff',
        };
      case 'danger':
        return {
          colors: ['#ef4444', '#dc2626'] as const,
          textColor: '#fff',
        };
      case 'cancel':
        return {
          colors: ['transparent', 'transparent'] as const,
          textColor: '#ef4444',
          noBg: true,
        };
      default:
        return {
          colors: ['#3b82f6', '#2563eb'] as const,
          textColor: '#fff',
        };
    }
  };

  const handleButtonPress = (button: JuicyModalButton) => {
    haptic.light?.();
    sound.playTap?.();
    button.onPress();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View 
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={styles.overlay}
        >
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          
          <TouchableWithoutFeedback>
            <Animated.View
              entering={SlideInDown.springify().damping(15)}
              exiting={SlideOutDown.duration(200)}
            >
              <LinearGradient
                colors={gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modalContainer}
              >
                {/* 🏷️ Title */}
                <View style={styles.titleRow}>
                  {titleEmoji && <Text style={styles.titleEmoji}>{titleEmoji}</Text>}
                  <Text style={styles.title}>{title}</Text>
                </View>

                {/* 📝 Message */}
                <Text style={styles.message}>{message}</Text>

                {/* 📝 Secondary Message (opsiyonel - uyarı vb.) */}
                {secondaryMessage && (
                  <View style={[styles.secondaryBox, { borderColor: accent }]}>
                    {secondaryEmoji && <Text style={styles.secondaryEmoji}>{secondaryEmoji}</Text>}
                    <Text style={styles.secondaryText}>{secondaryMessage}</Text>
                  </View>
                )}

                {/* 🎯 Buttons */}
                <View style={styles.buttonsRow}>
                  {(buttons || []).map((button, index) => {
                    const btnStyle = getButtonStyle(button.type);
                    
                    if (btnStyle.noBg) {
                      return (
                        <TouchableOpacity
                          key={index}
                          onPress={() => handleButtonPress(button)}
                          style={styles.cancelButton}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.cancelText, { color: btnStyle.textColor }]}>
                            {button.text}
                          </Text>
                        </TouchableOpacity>
                      );
                    }

                    return (
                      <TouchableOpacity
                        key={index}
                        onPress={() => handleButtonPress(button)}
                        activeOpacity={0.8}
                        style={styles.buttonWrapper}
                      >
                        <LinearGradient
                          colors={btnStyle.colors}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.button}
                        >
                          {button.emoji && <Text style={styles.buttonEmoji}>{button.emoji}</Text>}
                          <Text style={[styles.buttonText, { color: btnStyle.textColor }]}>
                            {button.text}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </LinearGradient>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: width * 0.85,
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  titleEmoji: {
    fontSize: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  secondaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  secondaryEmoji: {
    fontSize: 18,
  },
  secondaryText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 18,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  buttonWrapper: {
    flex: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  buttonEmoji: {
    fontSize: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default JuicyModal;

// 🎯 HOOK - Kolay kullanım için
import { useState, useCallback } from 'react';

interface UseJuicyModalOptions {
  title: string;
  titleEmoji?: string;
  message: string;
  secondaryMessage?: string;
  secondaryEmoji?: string;
  type?: JuicyModalProps['type'];
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmEmoji?: string;
}

export const useJuicyModal = () => {
  const [modalConfig, setModalConfig] = useState<UseJuicyModalOptions | null>(null);
  const [visible, setVisible] = useState(false);

  const showModal = useCallback((options: UseJuicyModalOptions) => {
    setModalConfig(options);
    setVisible(true);
  }, []);

  const hideModal = useCallback(() => {
    setVisible(false);
    setTimeout(() => setModalConfig(null), 200);
  }, []);

  const confirm = useCallback((options: UseJuicyModalOptions) => {
    return new Promise<boolean>((resolve) => {
      showModal({
        ...options,
        onConfirm: () => {
          hideModal();
          options.onConfirm?.();
          resolve(true);
        },
        onCancel: () => {
          hideModal();
          options.onCancel?.();
          resolve(false);
        },
      });
    });
  }, [showModal, hideModal]);

  const ModalComponent = modalConfig ? (
    <JuicyModal
      visible={visible}
      onClose={hideModal}
      title={modalConfig.title}
      titleEmoji={modalConfig.titleEmoji}
      message={modalConfig.message}
      secondaryMessage={modalConfig.secondaryMessage}
      secondaryEmoji={modalConfig.secondaryEmoji}
      type={modalConfig.type}
      buttons={[
        {
          text: modalConfig.cancelText || 'İptal',
          type: 'cancel',
          onPress: () => {
            hideModal();
            modalConfig.onCancel?.();
          },
        },
        {
          text: modalConfig.confirmText || 'Tamam',
          type: 'primary',
          emoji: modalConfig.confirmEmoji,
          onPress: () => {
            hideModal();
            modalConfig.onConfirm?.();
          },
        },
      ]}
    />
  ) : null;

  return {
    showModal,
    hideModal,
    confirm,
    ModalComponent,
  };
};

// 🎯 SIMPLE ALERT - Alert.alert yerine kullanılacak
export const showJuicyAlert = (
  title: string,
  message: string,
  type: JuicyModalProps['type'] = 'info'
) => {
  // Bu fonksiyon global state gerektirir, şimdilik placeholder
};
