import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const STORAGE_KEYS = {
  notificationsPrompted: '@farmenglish:notifications_prompted_v1',
  scheduleMeta: '@farmenglish:notifications_schedule_meta_v3',
} as const;

const MANAGED_REMINDER_SOURCE = 'comeback_retention_v3';
const MANAGED_REMINDER_LEGACY_SOURCE = 'daily_reminder';
const SCHEDULE_VERSION = 'v3';
const SCHEDULE_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const NOTIFICATION_API_TIMEOUT_MS = 5000;

let handlerConfigured = false;

export type NotificationPermissionResult = {
  granted: boolean;
  canAskAgain: boolean;
  status: Notifications.PermissionStatus;
};

export type ComebackNotificationOptions = {
  nickname?: string | null;
  force?: boolean;
  now?: Date;
};

type ScheduleMeta = {
  version: string;
  scheduledAt: number;
  nickname?: string;
  count: number;
};

const RETENTION_PLAN: Array<{ dayOffset: number; hour: number; minute: number; title: string; body: (nickname?: string) => string }> = [
  {
    dayOffset: 0,
    hour: 19,
    minute: 30,
    title: 'FarmEnglish',
    body: (nickname) =>
      nickname
        ? `${nickname}, tarlan seni bekliyor. 8 dakikalik quiz ile bugunku seriyi ac.`
        : 'Tarlan seni bekliyor. 8 dakikalik quiz ile bugunku seriyi ac.',
  },
  {
    dayOffset: 1,
    hour: 12,
    minute: 45,
    title: 'FarmEnglish Battle',
    body: (nickname) =>
      nickname
        ? `${nickname}, liderlik tablosunda yerini korumak icin 1 savas + 1 mini quiz hazir.`
        : 'Liderlik tablosunda yerini korumak icin 1 savas + 1 mini quiz hazir.',
  },
  {
    dayOffset: 2,
    hour: 20,
    minute: 15,
    title: 'FarmEnglish Pratik',
    body: (nickname) =>
      nickname
        ? `${nickname}, SesYap ve Puzzle turu ile bugun kelimeleri kalici hale getirebilirsin.`
        : 'SesYap ve Puzzle turu ile bugun kelimeleri kalici hale getirebilirsin.',
  },
];

function sanitizeNickname(input?: string | null): string | undefined {
  if (!input || typeof input !== 'string') return undefined;
  const trimmed = input.trim().replace(/\s+/g, ' ');
  if (!trimmed) return undefined;
  return trimmed.slice(0, 18);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } catch {
    return fallback;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function buildTriggerDate(baseDate: Date, dayOffset: number, hour: number, minute: number): Date {
  const target = new Date(baseDate);
  target.setSeconds(0, 0);
  target.setDate(target.getDate() + Math.max(0, dayOffset));
  target.setHours(hour, minute, 0, 0);
  return target;
}

function ensureFutureTrigger(baseDate: Date, targetDate: Date): Date {
  const minLeadMs = 90 * 1000;
  if (targetDate.getTime() - baseDate.getTime() > minLeadMs) return targetDate;
  const shifted = new Date(targetDate);
  shifted.setDate(shifted.getDate() + 1);
  return shifted;
}

async function readScheduleMeta(): Promise<ScheduleMeta | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.scheduleMeta);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ScheduleMeta;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.scheduledAt !== 'number' || !Number.isFinite(parsed.scheduledAt)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeScheduleMeta(meta: ScheduleMeta): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.scheduleMeta, JSON.stringify(meta));
  } catch {
    // no-op
  }
}

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

export async function scheduleComebackNotifications(options: ComebackNotificationOptions = {}): Promise<number> {
  configureNotifications();

  const permission = await getNotificationPermission();
  if (!permission.granted) return 0;

  const safeNickname = sanitizeNickname(options.nickname);
  const now = options.now instanceof Date ? options.now : new Date();
  const nowMs = now.getTime();

  if (!options.force) {
    const meta = await readScheduleMeta();
    if (
      meta &&
      meta.version === SCHEDULE_VERSION &&
      nowMs - meta.scheduledAt < SCHEDULE_COOLDOWN_MS &&
      meta.nickname === safeNickname
    ) {
      return 0;
    }
  }

  try {
    const existing = await withTimeout(
      Notifications.getAllScheduledNotificationsAsync(),
      NOTIFICATION_API_TIMEOUT_MS,
      [] as Notifications.NotificationRequest[],
    );

    const managed = existing.filter((item) => {
      const source = (item.content?.data as any)?.source;
      return source === MANAGED_REMINDER_SOURCE || source === MANAGED_REMINDER_LEGACY_SOURCE;
    });

    if (managed.length > 0) {
      await Promise.allSettled(
        managed.map((item) =>
          withTimeout(
            Notifications.cancelScheduledNotificationAsync(item.identifier),
            NOTIFICATION_API_TIMEOUT_MS,
            undefined as unknown as void,
          ),
        ),
      );
    }

    const scheduleTasks = RETENTION_PLAN.map((plan, index) => {
      const triggerDate = ensureFutureTrigger(now, buildTriggerDate(now, plan.dayOffset, plan.hour, plan.minute));
      return withTimeout(
        Notifications.scheduleNotificationAsync({
          content: {
            title: plan.title,
            body: plan.body(safeNickname),
            data: {
              source: MANAGED_REMINDER_SOURCE,
              slot: index + 1,
              nickname: safeNickname ?? '',
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          } as Notifications.DateTriggerInput,
        }),
        NOTIFICATION_API_TIMEOUT_MS,
        '',
      );
    });

    const scheduled = await Promise.allSettled(scheduleTasks);
    const successCount = scheduled.filter(
      (item): item is PromiseFulfilledResult<string> =>
        item.status === 'fulfilled' && typeof item.value === 'string' && item.value.length > 0,
    ).length;

    await writeScheduleMeta({
      version: SCHEDULE_VERSION,
      scheduledAt: nowMs,
      nickname: safeNickname,
      count: successCount,
    });

    return successCount;
  } catch {
    return 0;
  }
}

export async function scheduleNotificationPreview(seconds: number = 5): Promise<boolean> {
  try {
    configureNotifications();
    const delay = Math.max(1, Math.floor(seconds));
    const notificationId = await withTimeout(
      Notifications.scheduleNotificationAsync({
        content: {
          title: 'FarmEnglish Test',
          body: 'Bildirim testi basarili. Hatirlaticilar aktif.',
          data: { source: 'preview' },
        },
        trigger: {
          seconds: delay,
          repeats: false,
        } as Notifications.TimeIntervalTriggerInput,
      }),
      NOTIFICATION_API_TIMEOUT_MS,
      '',
    );

    return typeof notificationId === 'string' && notificationId.length > 0;
  } catch {
    return false;
  }
}
