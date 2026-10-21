import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';

import { Avatar, Badge, Button, EmptyState, Screen, ScreenHeader, Sheet, type SheetRef, Skeleton, SkeletonGroup, Text, TextField } from '@/components/ui';
import { useAdminUsers, useSetBanned, useUserLogs } from '@/hooks/api/business';
import { useDebouncedValue, usePullToRefresh } from '@/hooks/common';
import { errorMessageKey } from '@/lib/errors';
import { formatRelativeTime } from '@/lib/format';
import { formatUzPhone } from '@/lib/phone';
import { toast } from '@/store/toast';
import { layout, makeStyles, motion, radii, sizes, spacing, useTheme } from '@/theme';
import type { AdminUser } from '@/types/domain';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

const SKELETON_COUNT = 5;

function UserRow({ user, onToggleBan, onLogs }: { user: AdminUser; onToggleBan: () => void; onLogs: () => void }) {
  const styles = useStyles();
  const { t } = useTranslation();
  return (
    <View style={[styles.card, user.banned && styles.cardBanned]}>
      <View style={styles.cardTop}>
        <Avatar name={user.company ?? user.name} uri={user.avatar} size="md" />
        <View style={styles.flex}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {user.company ?? user.name}
          </Text>
          <Text variant="caption" color="secondary" numberOfLines={1}>
            {user.email} · {formatUzPhone(user.phone)}
          </Text>
          <View style={styles.badges}>
            <Badge tone="goldSoft" label={t(`roles.${user.role}`)} />
            {user.banned ? <Badge tone="danger" icon="ban" label={t('admin.bannedBadge')} /> : null}
            {user.listingsCount > 0 ? <Badge tone="neutral" label={t('admin.listings', { count: user.listingsCount })} /> : null}
          </View>
          <Text variant="caption" color="tertiary">
            {t('admin.lastActive', { time: formatRelativeTime(user.lastActiveAt, t) })}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button title={t('admin.logs')} variant="ghost" size="sm" leftIcon="list-outline" onPress={onLogs} />
        {user.role !== 'admin' ? (
          <Button
            title={user.banned ? t('admin.unban') : t('admin.ban')}
            variant={user.banned ? 'outline' : 'danger'}
            size="sm"
            leftIcon={user.banned ? 'lock-open-outline' : 'ban'}
            onPress={onToggleBan}
          />
        ) : null}
      </View>
    </View>
  );
}

/** Управление пользователями: поиск по телефону/email, блокировка, журнал активности. */
export default function AdminUsersScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim(), motion.searchDebounce);
  const users = useAdminUsers(debounced);
  const setBanned = useSetBanned();
  const [logsUser, setLogsUser] = useState<AdminUser | null>(null);
  const logs = useUserLogs(logsUser?.id ?? null);
  const logsSheet = useRef<SheetRef>(null);
  const { refreshing, onRefresh } = usePullToRefresh(users.refetch);

  const toggleBan = (user: AdminUser) =>
    setBanned.mutate(
      { userId: user.id, banned: !user.banned },
      {
        onSuccess: () => toast.success(user.banned ? t('admin.unbannedToast') : t('admin.bannedToast')),
        onError: (error) => toast.error(t(errorMessageKey(error))),
      },
    );

  const openLogs = (user: AdminUser) => {
    setLogsUser(user);
    logsSheet.current?.present();
  };

  return (
    <Screen>
      <ScreenHeader title={t('admin.users')} />
      <View style={styles.search}>
        <TextField
          leftIcon="search"
          placeholder={t('admin.searchPlaceholder')}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          accessibilityLabel={t('common.search')}
        />
      </View>
      <FlatList<AdminUser>
        data={users.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <UserRow user={item} onToggleBan={() => toggleBan(item)} onLogs={() => openLogs(item)} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          users.isLoading ? (
            <SkeletonGroup>
              <View style={styles.skeletons}>
                {Array.from({ length: SKELETON_COUNT }, (_, i) => (
                  <Skeleton key={i} height={sizes.avatar.xl + spacing.xxl} radius={radii.xl} />
                ))}
              </View>
            </SkeletonGroup>
          ) : users.isError ? (
            <EmptyState icon="cloud-offline-outline" title={t('errors.generic')} actionLabel={t('common.retry')} onAction={() => void users.refetch()} />
          ) : (
            <EmptyState icon="people-outline" title={t('admin.noUsers')} />
          )
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} progressBackgroundColor={colors.surface} />
        }
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.content}
      />

      <Sheet ref={logsSheet} title={t('admin.logs')} snapPoints={[...layout.sheetSnapPoints]} scrollable onDismiss={() => setLogsUser(null)}>
        {logsUser ? (
          <Text variant="bodyStrong" style={styles.logsUser}>
            {logsUser.company ?? logsUser.name}
          </Text>
        ) : null}
        {logs.isLoading ? (
          <ActivityIndicator color={colors.gold} />
        ) : logs.data && logs.data.length > 0 ? (
          <View style={styles.logs}>
            {logs.data.map((entry) => (
              <View key={entry.id} style={styles.logRow}>
                <View style={styles.logDot} />
                <View style={styles.flex}>
                  <Text variant="bodySm">{entry.action}</Text>
                  {entry.meta ? (
                    <Text variant="caption" color="secondary">
                      {entry.meta}
                    </Text>
                  ) : null}
                  <Text variant="caption" color="tertiary">
                    {formatRelativeTime(entry.createdAt, t)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text color="secondary">{t('admin.noLogs')}</Text>
        )}
      </Sheet>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  flex: {
    flex: 1,
    gap: spacing.xxs,
  },
  search: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.md,
  },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  separator: {
    height: spacing.md,
  },
  card: {
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radii.xl,
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  cardBanned: {
    borderColor: t.colors.danger,
  },
  cardTop: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  skeletons: {
    gap: spacing.md,
  },
  logsUser: {
    marginBottom: spacing.md,
  },
  logs: {
    gap: spacing.md,
  },
  logRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  logDot: {
    width: sizes.badgeDot,
    height: sizes.badgeDot,
    borderRadius: radii.pill,
    backgroundColor: t.colors.gold,
    marginTop: spacing.xs + spacing.xxs,
  },
}));
