import { type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, RefreshControl, useWindowDimensions, View } from 'react-native';

import { ComplexCard, ComplexCardSkeleton } from '@/components/property/ComplexCard';
import { PropertyCard, PropertyCardSkeleton } from '@/components/property/PropertyCard';
import { FeatureGate } from '@/components/system/AppSync';
import { EmptyState, SectionHeader, SkeletonGroup, Text } from '@/components/ui';
import { useCatalog, useComplexes } from '@/hooks/api/catalog';
import { usePullToRefresh, useRefreshOnFocus } from '@/hooks/common';
import type { CatalogFilters } from '@/store/filters';
import { layout, makeStyles, spacing, useTheme } from '@/theme';
import type { Complex, Property } from '@/types/domain';

const SKELETON_COUNT = 3;
const INITIAL_RENDER = 4;
const WINDOW_SIZE = 7;

interface CatalogListProps {
  filters: CatalogFilters;
  onResetFilters: () => void;
  listRef?: Ref<FlatList<Property>>;
}

function ComplexesRail() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const complexes = useComplexes();
  const cardWidth = Math.round(width * layout.complexCardRatio);

  if (complexes.isError && !complexes.data) return null;

  return (
    <View style={styles.rail}>
      <SectionHeader title={t('catalog.complexes')} subtitle={t('catalog.complexesSubtitle')} />
      <SkeletonGroup>
        <FlatList<Complex>
          horizontal
          data={complexes.data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ComplexCard complex={item} width={cardWidth} />}
          ItemSeparatorComponent={() => <View style={styles.hSeparator} />}
          ListEmptyComponent={complexes.isPending ? <ComplexCardSkeleton width={cardWidth} /> : undefined}
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardWidth + spacing.md}
          decelerationRate="fast"
          contentContainerStyle={styles.railContent}
        />
      </SkeletonGroup>
    </View>
  );
}

/** Режим «Список»: бесконечная лента с листаемыми фото, pull-to-refresh и скелетонами. */
export function CatalogList({ filters, onResetFilters, listRef }: CatalogListProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const catalog = useCatalog(filters);
  const { refreshing, onRefresh } = usePullToRefresh(catalog.refetch);
  useRefreshOnFocus(catalog.refetch);

  const cardWidth = width - layout.screenPadding * 2;
  const items = catalog.data?.pages.flatMap((page) => page.items) ?? [];
  const total = catalog.data?.pages[0]?.total ?? 0;
  const showComplexes = filters.dealType === 'sale' && filters.query.trim().length === 0;

  const header = (
    <View>
      {showComplexes ? (
        <FeatureGate flag="developerShowcases">
          <ComplexesRail />
        </FeatureGate>
      ) : null}
      {catalog.data ? (
        <View style={styles.countRow}>
          <Text variant="bodyStrong">{t('catalog.results', { count: total })}</Text>
          {catalog.isFetching && !catalog.isFetchingNextPage && !refreshing ? <ActivityIndicator size="small" color={colors.gold} /> : null}
        </View>
      ) : null}
    </View>
  );

  const empty = catalog.isPending ? (
    <SkeletonGroup>
      <View style={styles.skeletons}>
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <PropertyCardSkeleton key={i} width={cardWidth} />
        ))}
      </View>
    </SkeletonGroup>
  ) : catalog.isError ? (
    <EmptyState icon="cloud-offline-outline" title={t('errors.generic')} actionLabel={t('common.retry')} onAction={() => void catalog.refetch()} />
  ) : (
    <EmptyState
      icon="search-outline"
      title={t('catalog.emptyTitle')}
      text={t('catalog.emptyText')}
      actionLabel={t('catalog.resetFilters')}
      onAction={onResetFilters}
    />
  );

  return (
    <FlatList<Property>
      ref={listRef}
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <PropertyCard property={item} width={cardWidth} />
        </View>
      )}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={
        catalog.isFetchingNextPage ? (
          <SkeletonGroup>
            <View style={styles.item}>
              <PropertyCardSkeleton width={cardWidth} />
            </View>
          </SkeletonGroup>
        ) : (
          <View style={styles.footerSpacer} />
        )
      }
      onEndReached={() => {
        if (catalog.hasNextPage && !catalog.isFetchingNextPage && !catalog.isError) void catalog.fetchNextPage();
      }}
      onEndReachedThreshold={layout.listEndThreshold}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} progressBackgroundColor={colors.surface} />
      }
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      initialNumToRender={INITIAL_RENDER}
      windowSize={WINDOW_SIZE}
      removeClippedSubviews
    />
  );
}

const useStyles = makeStyles(() => ({
  rail: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  railContent: {
    paddingHorizontal: spacing.lg,
  },
  hSeparator: {
    width: spacing.md,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  item: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.lg,
  },
  skeletons: {
    paddingHorizontal: layout.screenPadding,
    gap: spacing.lg,
  },
  footerSpacer: {
    height: spacing.xxl,
  },
}));
