import type { AppNotification, ChatMessage, MessageStatus } from '@/types/domain';

/**
 * Real-time шина. Сейчас её питает mock-сервер (таймеры), в продакшене —
 * WebSocket / Supabase Realtime. Подписчики (экран чата, бейджи) не меняются.
 */
export type RealtimeEvent =
  | { type: 'message:new'; conversationId: string; message: ChatMessage }
  | { type: 'message:status'; conversationId: string; messageId: string; status: MessageStatus }
  | { type: 'typing'; conversationId: string; userId: string; typing: boolean }
  | { type: 'presence'; userId: string; online: boolean }
  | { type: 'notification:new'; notification: AppNotification };

type Listener = (event: RealtimeEvent) => void;

const listeners = new Set<Listener>();
let activeConversationId: string | null = null;

export const realtime = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  emit(event: RealtimeEvent): void {
    for (const listener of listeners) {
      try {
        listener(event);
      } catch {
        // подписчик не должен ломать доставку остальным
      }
    }
  },
  /** Какой диалог сейчас открыт — чтобы не слать пуш о сообщении в открытом чате. */
  setActiveConversation(id: string | null): void {
    activeConversationId = id;
  },
  getActiveConversation(): string | null {
    return activeConversationId;
  },
};
