import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { analytics } from '@/lib/analytics';
import { uid } from '@/lib/id';
import { qk } from '@/query/keys';
import { api, type ViewingWithProperty } from '@/services/api';
import { useIsSignedIn, useUserId } from '@/store/session';
import type { AppNotification, ChatMessage, Conversation, MessageAttachment } from '@/types/domain';

// ─────────────────────────────── Показы

export function useViewingSlots(propertyId: string) {
  return useQuery({ queryKey: qk.viewings.slots(propertyId), queryFn: () => api.viewings.slots(propertyId), staleTime: 15_000 });
}

export function useMyViewings() {
  const userId = useUserId();
  const signedIn = useIsSignedIn();
  return useQuery({ queryKey: qk.viewings.mine(userId), queryFn: api.viewings.mine, enabled: signedIn });
}

export function useBookViewing() {
  const client = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: api.viewings.book,
    onSuccess: (viewing) => {
      analytics.track('viewing_booked', { propertyId: viewing.propertyId });
      client.setQueryData<ViewingWithProperty[]>(qk.viewings.mine(userId), (old) =>
        old ? [...old, viewing].sort((a, b) => a.start.localeCompare(b.start)) : [viewing],
      );
      void client.invalidateQueries({ queryKey: qk.viewings.slots(viewing.propertyId) });
    },
  });
}

export function useCancelViewing() {
  const client = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: api.viewings.cancel,
    onMutate: async (viewingId: string) => {
      const key = qk.viewings.mine(userId);
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<ViewingWithProperty[]>(key);
      client.setQueryData<ViewingWithProperty[]>(key, (old) => old?.map((v) => (v.id === viewingId ? { ...v, status: 'cancelled' } : v)));
      return { previous };
    },
    onError: (_e, _id, context) => {
      if (context?.previous) client.setQueryData(qk.viewings.mine(userId), context.previous);
    },
    onSuccess: (_d, viewingId) => analytics.track('viewing_cancelled', { viewingId }),
  });
}

export function useSellerSchedule() {
  const userId = useUserId();
  return useQuery({ queryKey: qk.viewings.schedule(userId), queryFn: api.viewings.sellerSchedule });
}

export function useSaveSchedule() {
  const client = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: api.viewings.saveSchedule,
    onSuccess: () => client.invalidateQueries({ queryKey: qk.viewings.schedule(userId) }),
  });
}

// ─────────────────────────────── Чат

export function useConversations() {
  const userId = useUserId();
  const signedIn = useIsSignedIn();
  return useQuery({ queryKey: qk.chat.list(userId), queryFn: api.chat.conversations, enabled: signedIn });
}

export function useConversation(id: string) {
  const client = useQueryClient();
  const userId = useUserId();
  return useQuery({
    queryKey: qk.chat.conversation(id),
    queryFn: () => api.chat.conversation(id),
    placeholderData: () => client.getQueryData<Conversation[]>(qk.chat.list(userId))?.find((c) => c.id === id),
  });
}

export function useMessages(conversationId: string) {
  const client = useQueryClient();
  const userId = useUserId();
  return useQuery({
    queryKey: qk.chat.messages(conversationId),
    queryFn: async () => {
      const messages = await api.chat.messages(conversationId);
      client.setQueryData<Conversation[]>(qk.chat.list(userId), (old) =>
        old?.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
      );
      return messages;
    },
  });
}

interface SendVariables {
  text: string;
  attachments: MessageAttachment[];
  /** id оптимистичного сообщения (для повторной отправки «failed») */
  clientId?: string;
  quickReply?: boolean;
}

/** Отправка с оптимистичным пузырём «отправляется…» и статусом «не отправлено» при ошибке. */
export function useSendMessage(conversationId: string) {
  const client = useQueryClient();
  const userId = useUserId();
  const key = qk.chat.messages(conversationId);

  return useMutation<ChatMessage, unknown, SendVariables, { clientId: string }>({
    mutationFn: ({ text, attachments }) => api.chat.send(conversationId, { text, attachments }),
    onMutate: async (vars) => {
      await client.cancelQueries({ queryKey: key });
      const clientId = vars.clientId ?? uid('local');
      const optimistic: ChatMessage = {
        id: clientId,
        conversationId,
        senderId: userId,
        text: vars.text.trim(),
        attachments: vars.attachments,
        createdAt: new Date().toISOString(),
        status: 'sending',
      };
      client.setQueryData<ChatMessage[]>(key, (old) => [...(old ?? []).filter((m) => m.id !== clientId), optimistic]);
      return { clientId };
    },
    onSuccess: (message, vars, context) => {
      client.setQueryData<ChatMessage[]>(key, (old) => {
        const list = (old ?? []).filter((m) => m.id !== context.clientId && m.id !== message.id);
        return [...list, message];
      });
      client.setQueryData<Conversation[]>(qk.chat.list(userId), (old) =>
        old
          ?.map((c) => (c.id === conversationId ? { ...c, lastMessage: message, updatedAt: message.createdAt } : c))
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      );
      analytics.track('chat_message_sent', {
        conversationId,
        withAttachments: vars.attachments.length > 0,
        quickReply: Boolean(vars.quickReply),
      });
    },
    onError: (_error, _vars, context) => {
      if (!context) return;
      client.setQueryData<ChatMessage[]>(key, (old) => old?.map((m) => (m.id === context.clientId ? { ...m, status: 'failed' } : m)));
    },
  });
}

export function useStartChat() {
  const client = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: api.chat.startForProperty,
    onSuccess: (conversation) => {
      client.setQueryData(qk.chat.conversation(conversation.id), conversation);
      void client.invalidateQueries({ queryKey: qk.chat.list(userId) });
    },
  });
}

export function useSupportChat() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.chat.support,
    onSuccess: (conversation) => client.setQueryData(qk.chat.conversation(conversation.id), conversation),
  });
}

// ─────────────────────────────── Уведомления

export function useNotifications() {
  const userId = useUserId();
  const signedIn = useIsSignedIn();
  return useQuery({ queryKey: qk.notifications(userId), queryFn: api.notifications.list, enabled: signedIn });
}

export function useUnreadCounts(): { notifications: number; messages: number } {
  const notifications = useNotifications().data;
  const conversations = useConversations().data;
  return {
    notifications: notifications?.filter((n) => !n.read).length ?? 0,
    messages: conversations?.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0,
  };
}

export function useMarkNotificationRead() {
  const client = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: api.notifications.markRead,
    onMutate: (id: string) => {
      client.setQueryData<AppNotification[]>(qk.notifications(userId), (old) => old?.map((n) => (n.id === id ? { ...n, read: true } : n)));
    },
  });
}

export function useMarkAllNotificationsRead() {
  const client = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: api.notifications.markAllRead,
    onMutate: () => {
      const previous = client.getQueryData<AppNotification[]>(qk.notifications(userId));
      client.setQueryData<AppNotification[]>(qk.notifications(userId), (old) => old?.map((n) => ({ ...n, read: true })));
      return { previous };
    },
    onError: (_e, _v, context) => {
      if (context?.previous) client.setQueryData(qk.notifications(userId), context.previous);
    },
  });
}
