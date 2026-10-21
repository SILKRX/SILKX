import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, SectionList, View } from 'react-native';

import { Button, EmptyState, Icon, type IconName, Screen, ScreenHeader, Skeleton, SkeletonGroup, Text } from '@/components/ui';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/hooks/api/engagement';
import { usePullToRefresh, useRefreshOnFocus } from '@/hooks/common';
import { formatRelativeTime, isSameDay } from '@/lib/format';
import { toast } from '@/store/toast';
import { layout, makeStyles, radii, sizes, spacing, type ThemeColors, useTheme } from '@/theme';
import type { AppNotification, NotificationKind } from '@/types/domain';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

const KIND_STYLE: Record<NotificationKind, { icon: IconName; color: keyof ThemeColors; bg: keyof ThemeColors }> = {
  price_drop: { icon: 'trending-down', color: 'success', bg: 'successSoft' },
  new_match: { icon: 'sparkles', color: 'gold', bg: 'goldSoft' },
  viewing_reminder: { icon: 'alarm-outline', color: 'gold', bg: 'goldSoft' },
  viewing_request: { icon: 'calendar-outline', color: 'info', bg: 'infoSoft' },
  message: { icon: 'chatbubble-ellipses-outline', color: 'info', bg: 'infoSoft' },
  moderation_approved: { icon: 'checkmark-circle-outline', color: 'success', bg: 'successSoft' },
  moderation_rejected: { icon: 'close-circle-outline', color: 'danger', bg: 'dangerSoft' },
  payment_success: { icon: 'card-outline', color: 'gold', bg: 'goldSoft' },
  system: { icon: 'information-circle-outline', color: 'textSecondary', bg: 'surfaceMuted' },
};

const SKELETON_COUNT = 5;
const DAY_MS = 86_400_000;

interface Section {
  key: string;
  title: string;
  data: AppNotification[];
}

export default function NotificationsScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const { refreshing, onRefresh } = usePullToRefresh(notifications.refetch);
  useRefreshOnFocus(notifications.refetch);

  const items = notifications.data ?? [];
  const unread = items.filter((n) => !n.read).length;
  const now = new Date();
  const yesterday = new Date(now.getTime() - DAY_MS);
  const sections: Section[] = [
    { key: 'today', title: t('calendar.today'), data: items.filter((n) => isSameDay(new Date(n.createdAt), now)) },
    { key: 'yesterday', title: t('calendar.yesterday'), data: items.filter((n) => isSameDay(new Date(n.createdAt), yesterday)) },
    {
      key: 'earlier',
      title: t('calendar.earlier'),
      data: items.filter((n) => !isSameDay(new Date(n.createdAt), now) && !isSameDay(new Date(n.createdAt), yesterday)),
    },
  ].filter((section) => section.data.length > 0);

  const open = (notification: AppNotification) => {
    if (!notification.read) markRead.mutate(notification.id);
    if (notification.conversationId) router.push({ pathname: '/chats/[id]', params: { id: notification.conversationId } });
    else if (notification.propertyId) router.push({ pathname: '/property/[id]', params: { id: notification.propertyId } });
    else if (notification.kind === 'viewing_reminder' || notification.kind === 'viewing_request') router.push('/viewings');
    else if (notification.kind === 'payment_success' || notification.kind.startsWith('moderation')) router.push('/profile');
  };

  return (
    <Screen>
      <ScreenHeader
        title={t('notifications.title')}
        right={
          unread > 0 ? (
            <Button
              title={t('notifications.markAll')}
              variant="ghost"
              size="sm"
              onPress={() => markAll.mutate(undefined, { onSuccess: () => toast.success(t('notifications.allRead')) })}
            />
          ) : null
        }
      />
      <SectionList<AppNotification, Section>
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text variant="overline" color="tertiary" style={styles.sectionTitle}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => {
          const kind = KIND_STYLE[item.kind];
          return (
            <Pressable
              style={({ pressed }) => [styles.row, !item.read && styles.rowUnread, pressed && styles.rowPressed]}
              onPress={() => open(item)}
              accessibilityRole="button"
              accessibilityState={{ selected: !item.read }}
            >
              <View style={[styles.icon, { backgroundColor: colors[kind.bg] }]}>
                <Icon name={kind.icon} size="md" color={colors[kind.color]} />
              </View>
              <View style={styles.flex}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {item.title}
                </Text>
                <Text variant="bodySm" color="secondary" numberOfLines={layout.previewLines}>
                  {item.body}
                </Text>
                <Text variant="caption" color="tertiary">
                  {formatRelativeTime(item.createdAt, t)}
                </Text>
              </View>
              {!item.read ? <View style={styles.dot} /> : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          notifications.isLoading ? (
            <SkeletonGroup>
              <View style={styles.skeletons}>
                {Array.from({ length: SKELETON_COUNT }, (_, i) => (
                  <Skeleton key={i} height={sizes.avatar.xl} radius={radii.lg} />
                ))}
              </View>
            </SkeletonGroup>
          ) : notifications.isError ? (
            <EmptyState icon="cloud-offline-outline" title={t('errors.generic')} actionLabel={t('common.retry')} onAction={() => void notifications.refetch()} />
          ) : (
            <EmptyState icon="notifications-outline" title={t('notifications.emptyTitle')} text={t('notifications.emptyText')} />
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
    gap: spacing.xxs,
  },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  sectionTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  rowUnread: {
    borderColor: t.colors.goldBorder,
  },
  rowPressed: {
    backgroundColor: t.colors.surfacePressed,
  },
  icon: {
    width: sizes.iconButton.md,
    height: sizes.iconButton.md,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: sizes.badgeDot,
    height: sizes.badgeDot,
    borderRadius: radii.pill,
    backgroundColor: t.colors.gold,
    marginTop: spacing.xs,
  },
  skeletons: {
    gap: spacing.sm,
    paddingTop: spacing.lg,
  },
}));
