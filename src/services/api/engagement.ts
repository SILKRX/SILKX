import { ApiError } from '@/lib/errors';
import { uid } from '@/lib/id';
import { realtime } from '@/services/realtime';
import type {
  AppNotification,
  ChatMessage,
  ChatParticipant,
  Conversation,
  MessageAttachment,
  Property,
  Viewing,
  ViewingSlot,
} from '@/types/domain';

import { autoReplyFor, typingDurationFor } from '../mock/autoReply';
import { hydrateProperty, mockDb } from '../mock/db';
import { localDateKey, logActivity, pushNotification, ruDateTime } from '../mock/helpers';
import { SUPPORT_USER_ID } from '../mock/seed';
import type { ConversationRecord, MockDatabase, UserRecord } from '../mock/types';
import { authedRequest, type RequestContext, requireRole } from './client';

// ─────────────────────────────────────────── Показы

export interface DaySlots {
  date: string;
  slots: ViewingSlot[];
}

export interface ScheduleDay {
  date: string;
  hours: number[];
  booked: number[];
}

export interface ViewingWithProperty extends Viewing {
  property: Property | null;
  counterpartName: string;
  isIncoming: boolean;
}

const SLOT_DURATION_MIN = 60;
const SCHEDULE_DAYS = 14;

function defaultHours(date: Date): number[] {
  const day = date.getDay();
  if (day === 0) return [12, 13, 14, 15];
  if (day === 6) return [11, 12, 13, 14, 15, 16];
  return [10, 11, 12, 14, 15, 16, 17, 18];
}

function scheduledHours(db: MockDatabase, sellerId: string, date: Date): number[] {
  return db.schedules[sellerId]?.[localDateKey(date)] ?? defaultHours(date);
}

function bookedHours(db: MockDatabase, sellerId: string, date: Date): Set<number> {
  const key = localDateKey(date);
  const result = new Set<number>();
  for (const v of db.viewings) {
    if (v.sellerId !== sellerId || v.status !== 'scheduled') continue;
    const start = new Date(v.start);
    if (localDateKey(start) === key) result.add(start.getHours());
  }
  return result;
}

function dayAt(offset: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

function withProperty(db: MockDatabase, viewing: Viewing, viewerId: string): ViewingWithProperty {
  const record = db.properties.find((p) => p.id === viewing.propertyId);
  const isIncoming = viewing.sellerId === viewerId;
  const counterpart = db.users.find((u) => u.id === (isIncoming ? viewing.buyerId : viewing.sellerId));
  return {
    ...viewing,
    property: record ? hydrateProperty(db, record) : null,
    counterpartName: counterpart ? (counterpart.company ?? counterpart.name) : '—',
    isIncoming,
  };
}

export const viewingsApi = {
  slots: (propertyId: string) =>
    authedRequest<DaySlots[]>(
      (db) => {
        const property = db.properties.find((p) => p.id === propertyId);
        if (!property) throw new ApiError('NOT_FOUND');
        const now = Date.now();
        return Array.from({ length: SCHEDULE_DAYS }, (_, i) => {
          const day = dayAt(i);
          const booked = bookedHours(db, property.sellerId, day);
          const slots: ViewingSlot[] = scheduledHours(db, property.sellerId, day)
            .map((hour) => {
              const start = new Date(day);
              start.setHours(hour, 0, 0, 0);
              return { id: `${property.sellerId}_${start.getTime()}`, sellerId: property.sellerId, start: start.toISOString(), durationMin: SLOT_DURATION_MIN, booked: booked.has(hour) };
            })
            .filter((slot) => new Date(slot.start).getTime() > now + 60 * 60_000);
          return { date: localDateKey(day), slots };
        });
      },
      { latency: [220, 480] },
    ),

  book: (input: { propertyId: string; start: string; note: string }) =>
    authedRequest<ViewingWithProperty>(
      (db, ctx) => {
        const property = db.properties.find((p) => p.id === input.propertyId);
        if (!property) throw new ApiError('NOT_FOUND');
        if (property.sellerId === ctx.userId) throw new ApiError('FORBIDDEN');
        const start = new Date(input.start);
        if (Number.isNaN(start.getTime()) || start.getTime() < Date.now()) throw new ApiError('VALIDATION');
        const allowed = scheduledHours(db, property.sellerId, start).includes(start.getHours());
        if (!allowed || bookedHours(db, property.sellerId, start).has(start.getHours())) throw new ApiError('SLOT_TAKEN');
        const viewing: Viewing = {
          id: uid('v'),
          propertyId: property.id,
          buyerId: ctx.userId,
          sellerId: property.sellerId,
          start: start.toISOString(),
          durationMin: SLOT_DURATION_MIN,
          status: 'scheduled',
          note: input.note.trim(),
          createdAt: new Date().toISOString(),
        };
        db.viewings.push(viewing);
        pushNotification(db, property.sellerId, 'viewing_request', 'Новая заявка на просмотр', `${ctx.user.name} — ${ruDateTime(viewing.start)}`, {
          propertyId: property.id,
        });
        logActivity(db, ctx.userId, 'Запись на показ', property.id);
        return withProperty(db, viewing, ctx.userId);
      },
      { mutates: true, latency: [500, 900] },
    ),

  mine: () =>
    authedRequest<ViewingWithProperty[]>((db, ctx) =>
      db.viewings
        .filter((v) => v.buyerId === ctx.userId || v.sellerId === ctx.userId)
        .map((v) => {
          if (v.status === 'scheduled' && new Date(v.start).getTime() + v.durationMin * 60_000 < Date.now()) v.status = 'completed';
          return withProperty(db, v, ctx.userId);
        })
        .sort((a, b) => a.start.localeCompare(b.start)),
    ),

  cancel: (viewingId: string) =>
    authedRequest<void>(
      (db, ctx) => {
        const viewing = db.viewings.find((v) => v.id === viewingId);
        if (!viewing || (viewing.buyerId !== ctx.userId && viewing.sellerId !== ctx.userId)) throw new ApiError('NOT_FOUND');
        viewing.status = 'cancelled';
        const otherId = viewing.buyerId === ctx.userId ? viewing.sellerId : viewing.buyerId;
        pushNotification(db, otherId, 'system', 'Показ отменён', `${ctx.user.company ?? ctx.user.name} отменил(а) показ ${ruDateTime(viewing.start)}`, {
          propertyId: viewing.propertyId,
        });
      },
      { mutates: true },
    ),

  sellerSchedule: () =>
    authedRequest<ScheduleDay[]>((db, ctx) => {
      requireRole(ctx, 'seller', 'admin');
      return Array.from({ length: SCHEDULE_DAYS }, (_, i) => {
        const day = dayAt(i);
        return { date: localDateKey(day), hours: scheduledHours(db, ctx.userId, day), booked: Array.from(bookedHours(db, ctx.userId, day)) };
      });
    }),

  saveSchedule: (days: { date: string; hours: number[] }[]) =>
    authedRequest<void>(
      (db, ctx) => {
        requireRole(ctx, 'seller', 'admin');
        const own = (db.schedules[ctx.userId] ??= {});
        for (const day of days) own[day.date] = [...new Set(day.hours)].sort((a, b) => a - b);
      },
      { mutates: true },
    ),
};

// ─────────────────────────────────────────── Чат

function isOnline(user: UserRecord | undefined): boolean {
  if (!user) return false;
  if (user.id === SUPPORT_USER_ID) return true;
  const hour = new Date().getHours();
  if (user.role === 'seller' && hour >= 9 && hour < 21) return true;
  return Date.now() - new Date(user.lastActiveAt).getTime() < 5 * 60_000;
}

function participant(db: MockDatabase, userId: string): ChatParticipant {
  const user = db.users.find((u) => u.id === userId);
  return {
    id: userId,
    name: user ? (user.company ?? user.name) : '—',
    avatar: user?.avatar ?? null,
    role: user?.role ?? 'buyer',
    online: isOnline(user),
    lastSeenAt: user?.lastActiveAt ?? null,
    verified: user?.verified ?? false,
  };
}

function lastMessageOf(db: MockDatabase, conversationId: string): ChatMessage | null {
  let last: ChatMessage | null = null;
  for (const m of db.messages) {
    if (m.conversationId === conversationId && (!last || m.createdAt > last.createdAt)) last = m;
  }
  return last;
}

function toConversation(db: MockDatabase, record: ConversationRecord, viewerId: string): Conversation {
  const counterpartId = record.participantIds.find((id) => id !== viewerId) ?? viewerId;
  return {
    id: record.id,
    propertyId: record.propertyId,
    participantIds: record.participantIds,
    counterpart: participant(db, counterpartId),
    lastMessage: lastMessageOf(db, record.id),
    unreadCount: record.unread[viewerId] ?? 0,
    updatedAt: record.updatedAt,
    isSupport: record.isSupport,
  };
}

function ownConversation(db: MockDatabase, ctx: RequestContext, conversationId: string): ConversationRecord {
  const record = db.conversations.find((c) => c.id === conversationId);
  if (!record || !record.participantIds.includes(ctx.userId)) throw new ApiError('NOT_FOUND');
  return record;
}

const pendingReplies = new Map<string, ReturnType<typeof setTimeout>[]>();

/** Имитация собеседника: доставлено → прочитано → «печатает…» → ответ. */
function simulateCounterpart(conversationId: string, senderId: string, sent: ChatMessage): void {
  const db = mockDb.state;
  const record = db.conversations.find((c) => c.id === conversationId);
  if (!record) return;
  const counterpartId = record.participantIds.find((id) => id !== senderId);
  if (!counterpartId) return;
  const counterpart = db.users.find((u) => u.id === counterpartId);

  pendingReplies.get(conversationId)?.forEach(clearTimeout);
  const timers: ReturnType<typeof setTimeout>[] = [];

  const setStatus = (status: ChatMessage['status']) => {
    const message = mockDb.state.messages.find((m) => m.id === sent.id);
    if (!message || message.status === 'read') return;
    message.status = status;
    realtime.emit({ type: 'message:status', conversationId, messageId: sent.id, status });
    mockDb.markDirty();
  };

  timers.push(setTimeout(() => setStatus('delivered'), 700));
  timers.push(
    setTimeout(() => {
      setStatus('read');
      const r = mockDb.state.conversations.find((c) => c.id === conversationId);
      if (r) r.unread[counterpartId] = 0;
    }, 1700),
  );

  const reply = autoReplyFor(sent.text, counterpart?.role ?? 'seller', record.isSupport, sent.attachments.length > 0);
  const typingMs = typingDurationFor(reply);
  timers.push(setTimeout(() => realtime.emit({ type: 'typing', conversationId, userId: counterpartId, typing: true }), 2300));
  timers.push(
    setTimeout(() => {
      const state = mockDb.state;
      const conv = state.conversations.find((c) => c.id === conversationId);
      if (!conv) return;
      const message: ChatMessage = {
        id: uid('m'),
        conversationId,
        senderId: counterpartId,
        text: reply,
        attachments: [],
        createdAt: new Date().toISOString(),
        status: 'delivered',
      };
      state.messages.push(message);
      conv.updatedAt = message.createdAt;
      const counterpartUser = state.users.find((u) => u.id === counterpartId);
      if (counterpartUser) counterpartUser.lastActiveAt = message.createdAt;
      realtime.emit({ type: 'typing', conversationId, userId: counterpartId, typing: false });
      realtime.emit({ type: 'message:new', conversationId, message });
      if (realtime.getActiveConversation() !== conversationId) {
        conv.unread[senderId] = (conv.unread[senderId] ?? 0) + 1;
        const name = counterpartUser ? (counterpartUser.company ?? counterpartUser.name) : 'SILKX';
        pushNotification(state, senderId, 'message', 'Новое сообщение', `${name}: ${reply}`, { conversationId, propertyId: conv.propertyId });
      } else {
        message.status = 'read';
      }
      mockDb.markDirty();
      pendingReplies.delete(conversationId);
    }, 2300 + typingMs),
  );
  pendingReplies.set(conversationId, timers);
}

export const chatApi = {
  conversations: () =>
    authedRequest<Conversation[]>((db, ctx) =>
      db.conversations
        .filter((c) => c.participantIds.includes(ctx.userId))
        .map((c) => toConversation(db, c, ctx.userId))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    ),

  conversation: (conversationId: string) =>
    authedRequest<Conversation>((db, ctx) => toConversation(db, ownConversation(db, ctx, conversationId), ctx.userId)),

  messages: (conversationId: string) =>
    authedRequest<ChatMessage[]>(
      (db, ctx) => {
        const record = ownConversation(db, ctx, conversationId);
        record.unread[ctx.userId] = 0;
        const list = db.messages.filter((m) => m.conversationId === conversationId);
        for (const m of list) if (m.senderId !== ctx.userId && m.status !== 'read') m.status = 'read';
        return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      },
      { mutates: true, latency: [180, 380] },
    ),

  send: (conversationId: string, input: { text: string; attachments: MessageAttachment[] }) =>
    authedRequest<ChatMessage>(
      (db, ctx) => {
        const record = ownConversation(db, ctx, conversationId);
        const text = input.text.trim();
        if (!text && input.attachments.length === 0) throw new ApiError('VALIDATION');
        const message: ChatMessage = {
          id: uid('m'),
          conversationId,
          senderId: ctx.userId,
          text,
          attachments: input.attachments,
          createdAt: new Date().toISOString(),
          status: 'sent',
        };
        db.messages.push(message);
        record.updatedAt = message.createdAt;
        for (const id of record.participantIds) if (id !== ctx.userId) record.unread[id] = (record.unread[id] ?? 0) + 1;
        setTimeout(() => simulateCounterpart(conversationId, ctx.userId, message), 0);
        return message;
      },
      { mutates: true, latency: [220, 520] },
    ),

  startForProperty: (propertyId: string) =>
    authedRequest<Conversation>(
      (db, ctx) => {
        const property = db.properties.find((p) => p.id === propertyId);
        if (!property) throw new ApiError('NOT_FOUND');
        if (property.sellerId === ctx.userId) throw new ApiError('FORBIDDEN');
        let record = db.conversations.find(
          (c) => c.propertyId === propertyId && c.participantIds.includes(ctx.userId) && c.participantIds.includes(property.sellerId),
        );
        if (!record) {
          record = {
            id: uid('conv'),
            propertyId,
            participantIds: [ctx.userId, property.sellerId],
            updatedAt: new Date().toISOString(),
            isSupport: false,
            unread: {},
          };
          db.conversations.push(record);
        }
        return toConversation(db, record, ctx.userId);
      },
      { mutates: true },
    ),

  support: () =>
    authedRequest<Conversation>(
      (db, ctx) => {
        let record = db.conversations.find((c) => c.isSupport && c.participantIds.includes(ctx.userId));
        if (!record) {
          const now = new Date().toISOString();
          record = { id: uid('conv'), propertyId: null, participantIds: [ctx.userId, SUPPORT_USER_ID], updatedAt: now, isSupport: true, unread: {} };
          db.conversations.push(record);
          db.messages.push({
            id: uid('m'),
            conversationId: record.id,
            senderId: SUPPORT_USER_ID,
            text: 'Здравствуйте! Это поддержка SILKX. Чем можем помочь?',
            attachments: [],
            createdAt: now,
            status: 'delivered',
          });
        }
        return toConversation(db, record, ctx.userId);
      },
      { mutates: true },
    ),
};

// ─────────────────────────────────────────── Уведомления

export const notificationsApi = {
  list: () =>
    authedRequest<AppNotification[]>((db, ctx) =>
      db.notifications.filter((n) => n.userId === ctx.userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    ),

  markRead: (id: string) =>
    authedRequest<void>(
      (db, ctx) => {
        const n = db.notifications.find((x) => x.id === id && x.userId === ctx.userId);
        if (n) n.read = true;
      },
      { mutates: true, latency: [80, 200] },
    ),

  markAllRead: () =>
    authedRequest<void>(
      (db, ctx) => {
        for (const n of db.notifications) if (n.userId === ctx.userId) n.read = true;
      },
      { mutates: true, latency: [120, 260] },
    ),
};
