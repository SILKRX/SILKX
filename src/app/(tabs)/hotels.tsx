import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';

import { HotelCard, HotelCardSkeleton, HotelsDemoNote } from '@/components/hotels/HotelCard';
import { Chip, EmptyState, Screen, ScreenHeader, SkeletonGroup, Text } from '@/components/ui';
import { useHotels } from '@/hooks/api/hotels';
import { usePullToRefresh } from '@/hooks/common';
import { layout, makeStyles, spacing, useTheme } from '@/theme';
import type { DistrictId, Hotel } from '@/types/domain';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

const SKELETON_COUNT = 3;

/** Вкладка «Отели»: список отелей Ташкента с 3D-туром номеров и фильтром по району. */
export default function HotelsScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [district, setDistrict] = useState<DistrictId | null>(null);

  const all = useHotels(null);
  const hotels = useHotels(district);
  const districts = [...new Set((all.data ?? []).map((h) => h.district))];
  const { refreshing, onRefresh } = usePullToRefresh(() => hotels.refetch());

  return (
    <Screen>
      <ScreenHeader large showBack={false} title={t('hotels.listTitle')} />
      <FlatList<Hotel>
        data={hotels.isPending ? [] : (hotels.data ?? [])}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <HotelCard hotel={item} />
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text color="secondary" style={styles.padded}>
              {t('hotels.listSubtitle')}
            </Text>
            {districts.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                <Chip label={t('common.all')} selected={district === null} onPress={() => setDistrict(null)} />
                {districts.map((d) => (
                  <Chip key={d} label={t(`districts.${d}`)} selected={district === d} onPress={() => setDistrict(d)} />
                ))}
              </ScrollView>
            ) : null}
            <View style={styles.padded}>
              <HotelsDemoNote />
            </View>
          </View>
        }
        ListEmptyComponent={
          hotels.isPending ? (
            <SkeletonGroup>
              {Array.from({ length: SKELETON_COUNT }, (_, i) => (
                <View key={i} style={styles.item}>
                  <HotelCardSkeleton />
                </View>
              ))}
            </SkeletonGroup>
          ) : hotels.isError ? (
            <EmptyState icon="cloud-offline-outline" title={t('errors.generic')} actionLabel={t('common.retry')} onAction={() => void hotels.refetch()} />
          ) : (
            <EmptyState
              icon="bed-outline"
              title={t('hotels.emptyTitle')}
              actionLabel={district ? t('catalog.resetFilters') : undefined}
              onAction={district ? () => setDistrict(null) : undefined}
            />
          )
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} progressBackgroundColor={colors.surface} />
        }
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const useStyles = makeStyles(() => ({
  content: {
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  header: {
    gap: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
  },
  padded: {
    paddingHorizontal: layout.screenPadding,
  },
  chips: {
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
  },
  item: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.lg,
  },
}));
