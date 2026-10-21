import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { qk } from '@/query/keys';
import { realtime } from '@/services/realtime';
import { useUserId } from '@/store/session';
import type { AppNotification, ChatMessage, Conversation } from '@/types/domain';

/**
 * Связывает real-time события с кэшем React Query: новые сообщения, статусы
 * «доставлено/прочитано» и уведомления появляются без перезапроса.
 */
export function useRealtimeSync(): void {
  const client = useQueryClient();
  const userId = useUserId();

  useEffect(() => {
    return realtime.subscribe((event) => {
      switch (event.type) {
        case 'message:new': {
          client.setQueryData<ChatMessage[]>(qk.chat.messages(event.conversationId), (old) =>
            old && !old.some((m) => m.id === event.message.id) ? [...old, event.message] : old,
          );
          const isOpen = realtime.getActiveConversation() === event.conversationId;
          client.setQueryData<Conversation[]>(qk.chat.list(userId), (old) =>
            old
              ?.map((c) =>
                c.id === event.conversationId
                  ? {
                      ...c,
                      lastMessage: event.message,
                      updatedAt: event.message.createdAt,
                      unreadCount: isOpen || event.message.senderId === userId ? c.unreadCount : c.unreadCount + 1,
                      counterpart: { ...c.counterpart, online: true },
                    }
                  : c,
              )
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
          );
          break;
        }
        case 'message:status': {
          client.setQueryData<ChatMessage[]>(qk.chat.messages(event.conversationId), (old) =>
            old?.map((m) => (m.id === event.messageId ? { ...m, status: event.status } : m)),
          );
          break;
        }
        case 'notification:new': {
          if (event.notification.userId !== userId) return;
          client.setQueryData<AppNotification[]>(qk.notifications(userId), (old) =>
            old && !old.some((n) => n.id === event.notification.id) ? [event.notification, ...old] : old,
          );
          break;
        }
        case 'typing':
        case 'presence':
          break;
      }
    });
  }, [client, userId]);
}
