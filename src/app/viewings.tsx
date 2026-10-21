import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { Badge, type BadgeTone, Button, EmptyState, Icon, Screen, ScreenHeader, SegmentedControl, Skeleton, SkeletonGroup, Text } from '@/components/ui';
import { priceLabel, propertyTitle } from '@/features/property/format';
import { useCancelViewing, useMyViewings } from '@/hooks/api/engagement';
import { usePullToRefresh, useRefreshOnFocus } from '@/hooks/common';
import { errorMessageKey } from '@/lib/errors';
import { formatDateTime, formatTime } from '@/lib/format';
import type { ViewingWithProperty } from '@/services/api';
import { useRemindersStore } from '@/store/reminders';
import { toast } from '@/store/toast';
import { layout, makeStyles, motion, radii, sizes, spacing, useTheme } from '@/theme';
import type { ViewingStatus } from '@/types/domain';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

type Tab = 'upcoming' | 'past';

const STATUS_TONE: Record<ViewingStatus, BadgeTone> = {
  scheduled: 'gold',
  cancelled: 'danger',
  completed: 'success',
};

const MINUTE_MS = 60_000;
const SKELETON_COUNT = 3;

function ViewingCard({ viewing, onCancel, cancelling }: { viewing: ViewingWithProperty; onCancel?: () => void; cancelling: boolean }) {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const start = new Date(viewing.start);
  const end = new Date(start.getTime() + viewing.durationMin * MINUTE_MS);
  const cover = viewing.property?.images[0];

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.cardTop}
        disabled={!viewing.property}
        onPress={() => viewing.property && router.push({ pathname: '/property/[id]', params: { id: viewing.property.id } })}
        accessibilityRole="button"
      >
        {cover ? (
          <Image source={{ uri: cover }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" transition={motion.fast} />
        ) : (
          <View style={styles.thumb} />
        )}
        <View style={styles.flex}>
          <Badge tone={STATUS_TONE[viewing.status]} label={t(`viewings.status.${viewing.status}`)} />
          <Text variant="bodyStrong" numberOfLines={1}>
            {viewing.property ? propertyTitle(viewing.property, t) : '—'}
          </Text>
          {viewing.property ? (
            <Text variant="bodySm" color="secondary" numberOfLines={1}>
              {priceLabel(viewing.property, t)} · {t(`districts.${viewing.property.district}`)}
            </Text>
          ) : null}
        </View>
      </Pressable>
      <View style={styles.when}>
        <Icon name="calendar-outline" size="sm" color={colors.gold} />
        <Text variant="bodyStrong">
          {formatDateTime(start, t)} – {formatTime(end)}
        </Text>
      </View>
      <Text variant="bodySm" color="secondary">
        {viewing.isIncoming ? t('viewings.withBuyer', { name: viewing.counterpartName }) : t('viewings.with', { name: viewing.counterpartName })}
      </Text>
      {viewing.note ? (
        <Text variant="bodySm" color="tertiary" numberOfLines={layout.previewLines}>
          «{viewing.note}»
        </Text>
      ) : null}
      {onCancel ? (
        <View style={styles.cardFooter}>
          {!viewing.isIncoming ? (
            <View style={styles.reminder}>
              <Icon name="alarm-outline" size="xs" color={colors.textTertiary} />
              <Text variant="caption" color="tertiary">
                {t('viewings.reminder')}
              </Text>
            </View>
          ) : (
            <View />
          )}
          <Button title={t('viewings.cancel')} variant="ghost" size="sm" onPress={onCancel} loading={cancelling} />
        </View>
      ) : null}
    </View>
  );
}

export default function ViewingsScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('upcoming');
  const viewings = useMyViewings();
  const cancel = useCancelViewing();
  const cancelReminder = useRemindersStore((s) => s.cancel);
  const { refreshing, onRefresh } = usePullToRefresh(viewings.refetch);
  useRefreshOnFocus(viewings.refetch);

  const now = Date.now();
  const all = viewings.data ?? [];
  const upcoming = all.filter((v) => v.status === 'scheduled' && new Date(v.start).getTime() > now);
  const past = all.filter((v) => !upcoming.includes(v)).sort((a, b) => b.start.localeCompare(a.start));
  const data = tab === 'upcoming' ? upcoming : past;

  const onCancel = (viewing: ViewingWithProperty) => {
    cancel.mutate(viewing.id, {
      onSuccess: () => {
        void cancelReminder(viewing.id);
        toast.info(t('viewings.cancelled'));
      },
      onError: (error) => toast.error(t(errorMessageKey(error))),
    });
  };

  return (
    <Screen>
      <ScreenHeader title={t('viewings.title')} />
      <View style={styles.tabs}>
        <SegmentedControl<Tab>
          options={[
            { value: 'upcoming', label: `${t('viewings.upcoming')}${upcoming.length ? ` · ${upcoming.length}` : ''}` },
            { value: 'past', label: t('viewings.past') },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>
      <FlatList<ViewingWithProperty>
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ViewingCard
            viewing={item}
            cancelling={cancel.isPending && cancel.variables === item.id}
            onCancel={tab === 'upcoming' ? () => onCancel(item) : undefined}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          viewings.isLoading ? (
            <SkeletonGroup>
              <View style={styles.skeletons}>
                {Array.from({ length: SKELETON_COUNT }, (_, i) => (
                  <Skeleton key={i} height={sizes.avatar.xl * 2} radius={radii.xl} />
                ))}
              </View>
            </SkeletonGroup>
          ) : viewings.isError ? (
            <EmptyState icon="cloud-offline-outline" title={t('errors.generic')} actionLabel={t('common.retry')} onAction={() => void viewings.refetch()} />
          ) : (
            <EmptyState
              icon="calendar-outline"
              title={t('viewings.emptyTitle')}
              text={t('viewings.emptyText')}
              actionLabel={t('profile.findProperty')}
              onAction={() => router.push('/catalog')}
            />
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
    gap: spacing.xs,
  },
  tabs: {
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
  cardTop: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  thumb: {
    width: sizes.avatar.xl,
    height: sizes.avatar.xl,
    borderRadius: radii.md,
    backgroundColor: t.colors.skeleton,
  },
  when: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: sizes.divider,
    borderTopColor: t.colors.border,
  },
  reminder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  skeletons: {
    gap: spacing.md,
  },
}));
