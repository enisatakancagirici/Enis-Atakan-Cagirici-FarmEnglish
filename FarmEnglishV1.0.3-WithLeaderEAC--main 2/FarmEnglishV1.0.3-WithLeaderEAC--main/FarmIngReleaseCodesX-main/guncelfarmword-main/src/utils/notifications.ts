import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const STORAGE_KEYS = {
  notificationsPrompted: '@farmenglish:notifications_prompted_v1',
} as const;

let handlerConfigured = false;

export type NotificationPermissionResult = {
  granted: boolean;
  canAskAgain: boolean;
  status: Notifications.PermissionStatus;
};

export function configureNotifications(): void {
  if (handlerConfigured) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerConfigured = true;
  } catch {
    // Notification module unavailable or not initialized correctly
  }
}

export async function hasPromptedNotificationPermission(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.notificationsPrompted);
    return value === '1';
  } catch {
    return false;
  }
}

export async function markNotificationPermissionPrompted(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.notificationsPrompted, '1');
  } catch {
    // no-op
  }
}

export async function getNotificationPermission(): Promise<NotificationPermissionResult> {
  try {
    const perms = await Notifications.getPermissionsAsync();
    return {
      granted: perms.granted || perms.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL,
      canAskAgain: perms.canAskAgain,
      status: perms.status,
    };
  } catch {
    return {
      granted: false,
      canAskAgain: false,
      status: Notifications.PermissionStatus.DENIED,
    };
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermissionResult> {
  try {
    configureNotifications();
    const current = await getNotificationPermission();
    if (current.granted || !current.canAskAgain) return current;

    const requested = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    });

    return {
      granted: requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL,
      canAskAgain: requested.canAskAgain,
      status: requested.status,
    };
  } catch {
    return {
      granted: false,
      canAskAgain: false,
      status: Notifications.PermissionStatus.DENIED,
    };
  }
}

export async function scheduleComebackNotifications(): Promise<void> {
  configureNotifications();

  try {
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(existing.map(item => Notifications.cancelScheduledNotificationAsync(item.identifier)));
  } catch {
    // ignore cleanup failures
  }

  const messages = [
    'FarmEnglish tarlan seni bekliyor. Bugun 10 dakikalik hasat yapalim.',
    'Dun ektigin kelimeler buyuyor. Ciftlige geri don ve hasat et.',
    'Kisa bir quiz + SesYap turu ile seriyi koruyabilirsin.',
  ];

  const schedules = [
    { hour: 12, minute: 30, body: messages[0] },
    { hour: 18, minute: 45, body: messages[1] },
    { hour: 21, minute: 15, body: messages[2] },
  ];

  try {
    await Promise.all(
      schedules.map((item, index) =>
        Notifications.scheduleNotificationAsync({
          content: {
            title: 'FarmEnglish',
            body: item.body,
            data: { source: 'daily_reminder', slot: index + 1 },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: item.hour,
            minute: item.minute,
          } as Notifications.DailyTriggerInput,
        })
      )
    );
  } catch {
    // no-op
  }
}

export async function scheduleNotificationPreview(seconds: number = 5): Promise<boolean> {
  try {
    configureNotifications();
    const delay = Math.max(1, Math.floor(seconds));
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'FarmEnglish Test',
        body: 'Bildirim testi basarili. Hatirlaticilar aktif.',
        data: { source: 'preview' },
      },
      trigger: {
        seconds: delay,
        repeats: false,
      } as Notifications.TimeIntervalTriggerInput,
    });
    return true;
  } catch {
    return false;
  }
}
