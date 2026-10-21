import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Composer } from '@/components/chat/Composer';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { Avatar, EmptyState, Icon, IconButton, Text } from '@/components/ui';
import { priceLabel, propertyTitle } from '@/features/property/format';
import { useProperty } from '@/hooks/api/catalog';
import { useConversation, useMessages, useSendMessage } from '@/hooks/api/engagement';
import { analytics } from '@/lib/analytics';
import { formatRelativeDay, formatRelativeTime, isSameDay } from '@/lib/format';
import { realtime } from '@/services/realtime';
import { useUserId } from '@/store/session';
import { layout, makeStyles, radii, sizes, spacing, useTheme } from '@/theme';
import type { ChatMessage, MessageAttachment } from '@/types/domain';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

const QUICK_REPLY_KEYS = ['chat.quick1', 'chat.quick2', 'chat.quick3', 'chat.quick4'] as const;

function DayChip({ date }: { date: Date }) {
  const styles = useStyles();
  const { t } = useTranslation();
  return (
    <View style={styles.dayChipRow}>
      <View style={styles.dayChip}>
        <Text variant="caption" color="secondary">
          {formatRelativeDay(date, t)}
        </Text>
      </View>
    </View>
  );
}

/** Диалог: real-time сообщения, статусы доставки, «печатает…», вложения и быстрые ответы. */
export default function ChatScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id ?? '';
  const userId = useUserId();
  const conversation = useConversation(conversationId);
  const messages = useMessages(conversationId);
  const send = useSendMessage(conversationId);
  const propertyId = conversation.data?.propertyId ?? '';
  const property = useProperty(propertyId, { enabled: propertyId.length > 0 });
  const [typing, setTyping] = useState(false);

  useFocusEffect(
    useCallback(() => {
      realtime.setActiveConversation(conversationId);
      analytics.track('chat_opened', { conversationId });
      return () => realtime.setActiveConversation(null);
    }, [conversationId]),
  );

  useEffect(
    () =>
      realtime.subscribe((event) => {
        if (event.type === 'typing' && event.conversationId === conversationId && event.userId !== userId) setTyping(event.typing);
        if (event.type === 'message:new' && event.conversationId === conversationId && event.message.senderId !== userId) setTyping(false);
      }),
    [conversationId, userId],
  );

  const counterpart = conversation.data?.counterpart;
  const linkedProperty = property.data;
  const isSupport = conversation.data?.isSupport ?? false;
  const list = messages.data ?? [];
  const inverted = [...list].reverse();
  const hasOwnMessages = list.some((m) => m.senderId === userId);
  const quickReplies = !isSupport && !hasOwnMessages ? QUICK_REPLY_KEYS.map((key) => t(key)) : [];

  const status = typing
    ? t('chat.typing')
    : counterpart?.online
      ? t('chat.online')
      : counterpart?.lastSeenAt
        ? t('chat.lastSeen', { time: formatRelativeTime(counterpart.lastSeenAt, t) })
        : '';

  const onSend = (text: string, attachments: MessageAttachment[], quickReply?: boolean) =>
    send.mutate({ text, attachments, quickReply });

  const retry = (message: ChatMessage) => send.mutate({ text: message.text, attachments: message.attachments, clientId: message.id });

  const back = () => (router.canGoBack() ? router.back() : router.replace('/chats'));

  if (conversation.isError && !conversation.data) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <IconButton icon="chevron-back" variant="ghost" onPress={back} accessibilityLabel={t('common.back')} />
        </View>
        <EmptyState icon="chatbubbles-outline" title={t('errors.notFound')} actionLabel={t('common.retry')} onAction={() => void conversation.refetch()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" variant="ghost" onPress={back} accessibilityLabel={t('common.back')} />
        {counterpart ? (
          <>
            <Avatar name={counterpart.name} uri={counterpart.avatar} size="sm" online={counterpart.online} verified={counterpart.verified} />
            <View style={styles.flex}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {isSupport ? t('chat.support') : counterpart.name}
              </Text>
              {status ? (
                <Text variant="caption" color={typing || counterpart.online ? 'gold' : 'tertiary'} numberOfLines={1}>
                  {status}
                </Text>
              ) : null}
            </View>
          </>
        ) : (
          <View style={styles.flex} />
        )}
      </View>

      {linkedProperty ? (
        <Pressable
          style={styles.propertyCard}
          onPress={() => router.push({ pathname: '/property/[id]', params: { id: linkedProperty.id } })}
          accessibilityRole="button"
        >
          {linkedProperty.images[0] ? (
            <Image source={{ uri: linkedProperty.images[0] }} style={styles.propertyThumb} contentFit="cover" cachePolicy="memory-disk" />
          ) : null}
          <View style={styles.flex}>
            <Text variant="bodySm" numberOfLines={1}>
              {propertyTitle(linkedProperty, t)}
            </Text>
            <Text variant="bodyStrong" numberOfLines={1}>
              {priceLabel(linkedProperty, t)}
            </Text>
          </View>
          <Icon name="chevron-forward" size="sm" color={colors.textTertiary} />
        </Pressable>
      ) : null}

      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        {messages.isPending ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.gold} />
          </View>
        ) : (
          <FlatList<ChatMessage>
            data={inverted}
            inverted
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => {
              const older = inverted[index + 1];
              const date = new Date(item.createdAt);
              const showDay = !older || !isSameDay(new Date(older.createdAt), date);
              return (
                <View>
                  {showDay ? <DayChip date={date} /> : null}
                  <MessageBubble message={item} own={item.senderId === userId} onRetry={() => retry(item)} />
                </View>
              );
            }}
            ListHeaderComponent={typing ? <TypingIndicator /> : undefined}
            ListEmptyComponent={
              <View style={styles.emptyHint}>
                <Text color="secondary" align="center">
                  {t('chat.startHint')}
                </Text>
              </View>
            }
            contentContainerStyle={styles.listContent}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        )}
        <Composer onSend={onSend} quickReplies={quickReplies} disabled={!conversation.data} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    minHeight: sizes.header,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: sizes.border,
    borderBottomColor: t.colors.border,
  },
  propertyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: layout.screenPadding,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.goldBorder,
  },
  propertyThumb: {
    width: sizes.avatar.md,
    height: sizes.avatar.md,
    borderRadius: radii.sm,
    backgroundColor: t.colors.skeleton,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingVertical: spacing.md,
    flexGrow: 1,
  },
  emptyHint: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    // в перевёрнутом списке пустое состояние тоже перевёрнуто — возвращаем
    transform: [{ scaleY: -1 }],
  },
  dayChipRow: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  dayChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: t.colors.surfaceMuted,
  },
}));
