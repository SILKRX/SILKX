import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Badge, type BadgeTone, Button, EmptyState, Skeleton, SkeletonGroup, Text } from '@/components/ui';
import { priceLabel, propertyTitle } from '@/features/property/format';
import { useSellerListings, useSellerStats } from '@/hooks/api/business';
import { formatNumber, parseDateKey, weekdayShort } from '@/lib/format';
import { useFeatureFlag } from '@/store/flags';
import { layout, makeStyles, motion, radii, sizes, spacing } from '@/theme';
import type { ListingStatus, Property } from '@/types/domain';

import { StatsRow } from './ProfileParts';

const STATUS_TONE: Record<ListingStatus, BadgeTone> = {
  active: 'success',
  pending: 'warning',
  rejected: 'danger',
  archived: 'neutral',
};

const PERCENT = 100;
const MIN_BAR_RATIO = 0.06;

/** Мини-график просмотров за 7 дней. */
function ViewsChart({ daily }: { daily: readonly { date: string; views: number }[] }) {
  const styles = useStyles();
  const { t } = useTranslation();
  const max = Math.max(1, ...daily.map((d) => d.views));
  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text variant="title">{t('profile.statViews')}</Text>
        <Text variant="caption" color="secondary">
          {t('profile.last7days')}
        </Text>
      </View>
      <View style={styles.chart}>
        {daily.map((day) => {
          const ratio = Math.max(day.views / max, MIN_BAR_RATIO);
          return (
            <View key={day.date} style={styles.barColumn} accessible accessibilityLabel={`${day.date}: ${day.views}`}>
              <Text variant="micro" color="tertiary">
                {day.views}
              </Text>
              <View style={styles.barTrack}>
                <View style={[styles.bar, { height: `${ratio * PERCENT}%` }]} />
              </View>
              <Text variant="micro" color="secondary">
                {weekdayShort(parseDateKey(day.date), t)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ListingRow({ property }: { property: Property }) {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const promotionsEnabled = useFeatureFlag('promotions');
  const cover = property.images[0];
  return (
    <Pressable style={styles.listing} onPress={() => router.push({ pathname: '/property/[id]', params: { id: property.id } })} accessibilityRole="button">
      {cover ? (
        <Image source={{ uri: cover }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" transition={motion.fast} />
      ) : (
        <View style={styles.thumb} />
      )}
      <View style={styles.listingInfo}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {propertyTitle(property, t)}
        </Text>
        <Text variant="bodySm" color="secondary">
          {priceLabel(property, t)} · {t('property.views', { count: property.views })}
        </Text>
        <View style={styles.listingBadges}>
          <Badge tone={STATUS_TONE[property.status]} label={t(`profile.listingStatus.${property.status}`)} />
          {property.promotion ? <Badge tone="gold" icon="rocket" label={t(`promote.tiers.${property.promotion}.title`)} /> : null}
        </View>
        {property.status === 'rejected' && property.rejectionReason ? (
          <Text variant="caption" color="danger">
            {t('profile.rejectedReason', { reason: t(`admin.reasons.${property.rejectionReason}`) })}
          </Text>
        ) : null}
      </View>
      {property.status === 'active' && !property.promotion && promotionsEnabled ? (
        <Button
          title={t('profile.promote')}
          size="sm"
          variant="outline"
          onPress={() => router.push({ pathname: '/listing/[id]/promote', params: { id: property.id } })}
        />
      ) : null}
    </Pressable>
  );
}

/** Кабинет продавца: статистика, график просмотров и список объявлений. */
export function SellerDashboard() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const stats = useSellerStats();
  const listings = useSellerListings();

  return (
    <View style={styles.root}>
      <Button title={t('profile.createListing')} leftIcon="add-circle-outline" size="lg" fullWidth onPress={() => router.push('/listing/create')} />

      {stats.data ? (
        <>
          <StatsRow
            items={[
              { key: 'views', label: t('profile.statViews'), value: stats.data.views },
              { key: 'fav', label: t('profile.statInFavorites'), value: stats.data.favorites },
              { key: 'calls', label: t('profile.statCalls'), value: stats.data.calls },
              { key: 'conv', label: t('profile.statConversion'), value: `${formatNumber(stats.data.conversion, 1)}%` },
            ]}
          />
          <ViewsChart daily={stats.data.daily} />
        </>
      ) : (
        <SkeletonGroup>
          <Skeleton height={sizes.avatar.xl} radius={radii.xl} />
          <Skeleton height={layout.statsChartHeight + spacing.giant} radius={radii.xl} style={styles.skeletonGap} />
        </SkeletonGroup>
      )}

      <View style={styles.listingsHeader}>
        <Text variant="h3">{t('profile.myListings')}</Text>
        {listings.data ? (
          <Text variant="caption" color="secondary">
            {t('admin.listings', { count: listings.data.length })}
          </Text>
        ) : null}
      </View>
      {listings.data && listings.data.length === 0 ? (
        <EmptyState compact icon="home-outline" title={t('profile.noListings')} actionLabel={t('profile.createListing')} onAction={() => router.push('/listing/create')} />
      ) : (
        <View style={styles.listings}>
          {(listings.data ?? []).map((property) => (
            <ListingRow key={property.id} property={property} />
          ))}
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    gap: spacing.lg,
  },
  skeletonGap: {
    marginTop: spacing.lg,
  },
  chartCard: {
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  barTrack: {
    width: '100%',
    height: layout.statsChartHeight,
    justifyContent: 'flex-end',
    borderRadius: radii.sm,
    backgroundColor: t.colors.surfaceMuted,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: radii.sm,
    backgroundColor: t.colors.gold,
  },
  listingsHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  listings: {
    gap: spacing.md,
  },
  listing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  thumb: {
    width: sizes.avatar.lg,
    height: sizes.avatar.lg,
    borderRadius: radii.md,
    backgroundColor: t.colors.skeleton,
  },
  listingInfo: {
    flex: 1,
    gap: spacing.xxs,
  },
  listingBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
}));
