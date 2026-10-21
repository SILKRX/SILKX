import { ru } from '@/i18n/locales/ru';
import { uid } from '@/lib/id';
import { realtime } from '@/services/realtime';
import type { AppNotification, NotificationKind } from '@/types/domain';

import type { MockDatabase } from './types';

const RU_MONTHS = Object.values(ru.calendar.monthsGenitive);

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Русская дата для текстов серверных уведомлений: «18 октября в 15:00». */
export function ruDateTime(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getDate()} ${RU_MONTHS[d.getMonth()] ?? ''} в ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function pushNotification(
  db: MockDatabase,
  userId: string,
  kind: NotificationKind,
  title: string,
  body: string,
  extra: { propertyId?: string | null; conversationId?: string | null } = {},
): AppNotification {
  const notification: AppNotification = {
    id: uid('n'),
    userId,
    kind,
    title,
    body,
    createdAt: new Date().toISOString(),
    read: false,
    propertyId: extra.propertyId ?? null,
    conversationId: extra.conversationId ?? null,
  };
  db.notifications.unshift(notification);
  realtime.emit({ type: 'notification:new', notification });
  return notification;
}

export function logActivity(db: MockDatabase, userId: string, action: string, meta: string | null = null): void {
  db.logs.unshift({ id: uid('log'), userId, action, createdAt: new Date().toISOString(), meta });
  if (db.logs.length > 600) db.logs.length = 600;
}
