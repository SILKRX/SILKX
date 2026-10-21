import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { Avatar, Button, EmptyState, Icon, IconButton, Screen, ScreenHeader, Skeleton, SkeletonGroup, Text } from '@/components/ui';
import { useConversations, useSupportChat } from '@/hooks/api/engagement';
import { usePullToRefresh, useRefreshOnFocus } from '@/hooks/common';
import { errorMessageKey } from '@/lib/errors';
import { formatChatTimestamp } from '@/lib/format';
import { useUserId } from '@/store/session';
import { toast } from '@/store/toast';
import { layout, makeStyles, radii, sizes, spacing, typography, useTheme } from '@/theme';
import type { Conversation } from '@/types/domain';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

const SKELETON_COUNT = 6;
const MAX_BADGE = 99;

function ConversationRow({ conversation, onPress }: { conversation: Conversation; onPress: () => void }) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const userId = useUserId();
  const last = conversation.lastMessage;
  const own = last?.senderId === userId;
  const preview = last
    ? `${own ? `${t('chat.you')}: ` : ''}${last.text || (last.attachments[0]?.kind === 'image' ? t('chat.photo') : t('chat.attachment'))}`
    : '';
  const unread = conversation.unreadCount > 0;

  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress} accessibilityRole="button">
      <Avatar name={conversation.counterpart.name} uri={conversation.counterpart.avatar} size="md" online={conversation.counterpart.online} />
      <View style={styles.flex}>
        <View style={styles.titleRow}>
          <Text variant="bodyStrong" numberOfLines={1} style={styles.flex}>
            {conversation.isSupport ? t('chat.support') : conversation.counterpart.name}
          </Text>
          {conversation.counterpart.verified ? <Icon name="shield-checkmark" size="xs" color={colors.gold} /> : null}
          {last ? (
            <Text variant="caption" color={unread ? 'gold' : 'tertiary'}>
              {formatChatTimestamp(last.createdAt, t)}
            </Text>
          ) : null}
        </View>
        <View style={styles.titleRow}>
          <Text variant="bodySm" color={unread ? 'primary' : 'secondary'} numberOfLines={1} style={styles.flex}>
            {preview}
          </Text>
          {unread ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{conversation.unreadCount > MAX_BADGE ? `${MAX_BADGE}+` : conversation.unreadCount}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function ChatsScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const conversations = useConversations();
  const support = useSupportChat();
  const { refreshing, onRefresh } = usePullToRefresh(conversations.refetch);
  useRefreshOnFocus(conversations.refetch);

  const openSupport = () =>
    support.mutate(undefined, {
      onSuccess: (conversation) => router.push({ pathname: '/chats/[id]', params: { id: conversation.id } }),
      onError: (error) => toast.error(t(errorMessageKey(error))),
    });

  return (
    <Screen>
      <ScreenHeader
        title={t('chat.title')}
        right={<IconButton icon="help-buoy-outline" onPress={openSupport} accessibilityLabel={t('chat.support')} />}
      />
      <FlatList<Conversation>
        data={conversations.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationRow conversation={item} onPress={() => router.push({ pathname: '/chats/[id]', params: { id: item.id } })} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          conversations.isLoading ? (
            <SkeletonGroup>
              <View style={styles.skeletons}>
                {Array.from({ length: SKELETON_COUNT }, (_, i) => (
                  <Skeleton key={i} height={sizes.avatar.md + spacing.lg} radius={radii.lg} />
                ))}
              </View>
            </SkeletonGroup>
          ) : conversations.isError ? (
            <EmptyState icon="cloud-offline-outline" title={t('errors.generic')} actionLabel={t('common.retry')} onAction={() => void conversations.refetch()} />
          ) : (
            <View>
              <EmptyState icon="chatbubbles-outline" title={t('chat.emptyTitle')} text={t('chat.emptyText')} />
              <Button title={t('chat.support')} variant="outline" leftIcon="help-buoy-outline" onPress={openSupport} loading={support.isPending} style={styles.supportButton} />
            </View>
          )
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} progressBackgroundColor={colors.surface} />
        }
        contentContainerStyle={styles.content}
      />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  flex: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
  },
  rowPressed: {
    backgroundColor: t.colors.surfacePressed,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  separator: {
    height: sizes.divider,
    marginLeft: layout.screenPadding + sizes.avatar.md + spacing.md,
    backgroundColor: t.colors.border,
  },
  badge: {
    minWidth: spacing.xl,
    height: spacing.xl,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: t.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...typography.micro,
    color: t.colors.textOnGold,
  },
  skeletons: {
    gap: spacing.md,
    padding: layout.screenPadding,
  },
  supportButton: {
    alignSelf: 'center',
  },
}));
