import { Platform } from 'react-native';

import { env } from './env';
import { monitoring } from './monitoring';

type NotificationsModule = typeof import('expo-notifications');

let cachedModule: NotificationsModule | null | undefined;

/**
 * expo-notifications загружается лениво: в Expo Go на Android SDK 53+ удалённые пуши
 * недоступны, и сам импорт модуля пишет ошибку в консоль. Поэтому в Expo Go/Android
 * и на web работаем только через внутренний центр уведомлений приложения.
 */
function getNotifications(): NotificationsModule | null {
  if (cachedModule !== undefined) return cachedModule;
  if (Platform.OS === 'web' || (env.isExpoGo && Platform.OS === 'android')) {
    cachedModule = null;
    return null;
  }
  try {
    cachedModule = require('expo-notifications') as NotificationsModule;
  } catch (error) {
    monitoring.captureException(error, { scope: 'push.load' });
    cachedModule = null;
  }
  return cachedModule;
}

let handlerConfigured = false;

export function configureNotificationHandler(): void {
  const Notifications = getNotifications();
  if (!Notifications || handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function ensurePushPermission(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch (error) {
    monitoring.captureException(error, { scope: 'push.permission' });
    return false;
  }
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

/** Локальное напоминание о показе за 2 часа. Возвращает id для отмены. */
export async function scheduleViewingReminder(params: {
  start: Date;
  title: string;
  body: string;
}): Promise<string | null> {
  const Notifications = getNotifications();
  if (!Notifications) return null;
  const fireAt = params.start.getTime() - TWO_HOURS_MS;
  if (fireAt <= Date.now()) return null;
  const granted = await ensurePushPermission();
  if (!granted) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title: params.title, body: params.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(fireAt) },
    });
  } catch (error) {
    monitoring.captureException(error, { scope: 'push.schedule' });
    return null;
  }
}

export async function cancelScheduledReminder(id: string): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (error) {
    monitoring.captureException(error, { scope: 'push.cancel' });
  }
}

/** Push-токен для бэкенда — только в dev/prod-сборках с EAS projectId. */
export async function registerForRemotePush(projectId: string | undefined): Promise<string | null> {
  const Notifications = getNotifications();
  if (!Notifications || env.isExpoGo || !projectId) return null;
  const granted = await ensurePushPermission();
  if (!granted) return null;
  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch (error) {
    monitoring.captureException(error, { scope: 'push.token' });
    return null;
  }
}
