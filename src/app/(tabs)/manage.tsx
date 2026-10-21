import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';

import { StatsRow } from '@/components/profile/ProfileParts';
import { Badge, Button, EmptyState, Icon, IconButton, PressableScale, Screen, ScreenHeader, Sheet, type SheetRef, Skeleton, SkeletonGroup, Text } from '@/components/ui';
import { priceLabel, propertyTitle } from '@/features/property/format';
import { useAdminOverview, useModerate, useModerationQueue } from '@/hooks/api/business';
import { usePullToRefresh, useRefreshOnFocus } from '@/hooks/common';
import { errorMessageKey } from '@/lib/errors';
import { formatRelativeTime } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { toast } from '@/store/toast';
import { layout, makeStyles, motion, radii, sizes, spacing, useTheme } from '@/theme';
import type { Property, RejectionReason } from '@/types/domain';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

const REJECTION_REASONS: readonly RejectionReason[] = ['bad_photos', 'wrong_price', 'duplicate', 'incomplete', 'prohibited'];
const SKELETON_COUNT = 3;

function QueueCard({ property, onApprove, onReject }: { property: Property; onApprove: () => void; onReject: () => void }) {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const cover = property.images[0];
  return (
    <Animated.View exiting={FadeOut.duration(motion.fast)} layout={LinearTransition.duration(motion.base)} style={styles.card}>
      <Pressable style={styles.cardTop} onPress={() => router.push({ pathname: '/property/[id]', params: { id: property.id } })} accessibilityRole="button">
        {cover ? <Image source={{ uri: cover }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" /> : <View style={styles.thumb} />}
        <View style={styles.flex}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {propertyTitle(property, t)}
          </Text>
          <Text variant="title">{priceLabel(property, t)}</Text>
          <Text variant="caption" color="secondary" numberOfLines={1}>
            {t(`districts.${property.district}`)} · {property.address}
          </Text>
          <Text variant="caption" color="tertiary" numberOfLines={1}>
            {t('admin.submittedBy', { name: property.seller.name })} · {formatRelativeTime(property.createdAt, t)}
          </Text>
        </View>
      </Pressable>
      <View style={styles.meta}>
        <Badge tone="neutral" icon="images-outline" label={String(property.images.length)} />
        <Badge tone="neutral" icon="document-text-outline" label={String(property.description.length)} />
        {property.installment ? <Badge tone="goldSoft" label={t('property.installment')} /> : null}
      </View>
      <View style={styles.actions}>
        <View style={styles.flex}>
          <Button title={t('admin.reject')} variant="secondary" leftIcon="close-circle-outline" fullWidth onPress={onReject} />
        </View>
        <View style={styles.flex}>
          <Button title={t('admin.approve')} leftIcon="checkmark-circle-outline" fullWidth onPress={onApprove} />
        </View>
      </View>
    </Animated.View>
  );
}

/** Панель модерации: очередь объявлений, одобрение и отклонение с причиной. */
export default function ManageScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const queue = useModerationQueue();
  const overview = useAdminOverview();
  const moderate = useModerate();
  const rejectSheet = useRef<SheetRef>(null);
  const [rejecting, setRejecting] = useState<Property | null>(null);
  const [reason, setReason] = useState<RejectionReason>('bad_photos');

  const { refreshing, onRefresh } = usePullToRefresh(() => Promise.all([queue.refetch(), overview.refetch()]));
  useRefreshOnFocus(queue.refetch);

  const approve = (property: Property) => {
    haptics.success();
    moderate.mutate(
      { id: property.id, decision: 'approve' },
      {
        onSuccess: () => toast.success(t('admin.approved')),
        onError: (error) => toast.error(t(errorMessageKey(error))),
      },
    );
  };

  const openReject = (property: Property) => {
    setRejecting(property);
    setReason('bad_photos');
    rejectSheet.current?.present();
  };

  const confirmReject = () => {
    if (!rejecting) return;
    const target = rejecting;
    rejectSheet.current?.dismiss();
    haptics.warning();
    moderate.mutate(
      { id: target.id, decision: 'reject', reason },
      {
        onSuccess: () => toast.info(t('admin.rejected')),
        onError: (error) => toast.error(t(errorMessageKey(error))),
      },
    );
  };

  return (
    <Screen>
      <ScreenHeader
        large
        showBack={false}
        title={t('admin.title')}
        right={<IconButton icon="people-outline" onPress={() => router.push('/admin/users')} accessibilityLabel={t('admin.users')} />}
      />
      <FlatList<Property>
        data={queue.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <QueueCard property={item} onApprove={() => approve(item)} onReject={() => openReject(item)} />
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <StatsRow
              items={[
                { key: 'pending', label: t('admin.moderation'), value: overview.data?.pending ?? '—' },
                { key: 'active', label: t('profile.listingStatus.active'), value: overview.data?.activeListings ?? '—' },
                { key: 'users', label: t('admin.users'), value: overview.data?.users ?? '—' },
              ]}
            />
            <Text variant="h3">{t('admin.moderation')}</Text>
          </View>
        }
        ListEmptyComponent={
          queue.isPending ? (
            <SkeletonGroup>
              <View style={styles.item}>
                {Array.from({ length: SKELETON_COUNT }, (_, i) => (
                  <Skeleton key={i} height={sizes.avatar.xl * 2} radius={radii.xl} style={styles.skeleton} />
                ))}
              </View>
            </SkeletonGroup>
          ) : queue.isError ? (
            <EmptyState icon="cloud-offline-outline" title={t('errors.generic')} actionLabel={t('common.retry')} onAction={() => void queue.refetch()} />
          ) : (
            <EmptyState icon="checkmark-done-circle-outline" title={t('admin.queueEmptyTitle')} text={t('admin.queueEmptyText')} />
          )
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} progressBackgroundColor={colors.surface} />
        }
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      />

      <Sheet ref={rejectSheet} title={t('admin.rejectTitle')} onDismiss={() => setRejecting(null)}>
        <View style={styles.reasons}>
          {REJECTION_REASONS.map((value) => {
            const selected = value === reason;
            return (
              <PressableScale
                key={value}
                haptic="selection"
                scaleTo={motion.pressScaleSubtle}
                onPress={() => setReason(value)}
                style={[styles.reason, selected && styles.reasonSelected]}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
              >
                <Text variant={selected ? 'bodyStrong' : 'body'} style={styles.flex}>
                  {t(`admin.reasons.${value}`)}
                </Text>
                <Icon name={selected ? 'radio-button-on' : 'radio-button-off'} size="md" color={selected ? colors.gold : colors.textTertiary} />
              </PressableScale>
            );
          })}
          <Button title={t('admin.reject')} variant="danger" fullWidth onPress={confirmReject} style={styles.rejectButton} />
        </View>
      </Sheet>
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
  header: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.xl,
  },
  item: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.md,
  },
  skeleton: {
    marginBottom: spacing.md,
  },
  card: {
    padding: spacing.md,
    gap: spacing.md,
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
    width: sizes.photoTile,
    height: sizes.photoTile,
    borderRadius: radii.md,
    backgroundColor: t.colors.skeleton,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  reasons: {
    gap: spacing.xs,
  },
  reason: {
    minHeight: sizes.touch + spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  reasonSelected: {
    backgroundColor: t.colors.goldSoft,
  },
  rejectButton: {
    marginTop: spacing.md,
  },
}));
