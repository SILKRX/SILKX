import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, useWindowDimensions, View } from 'react-native';

import { PropertyCard, PropertyCardSkeleton } from '@/components/property/PropertyCard';
import { EmptyState, Screen, ScreenHeader, SkeletonGroup } from '@/components/ui';
import { usePropertiesByIds } from '@/hooks/api/catalog';
import { useFavoritesSync } from '@/hooks/api/favorites';
import { usePullToRefresh, useRefreshOnFocus } from '@/hooks/common';
import { useFavoritesStore } from '@/store/favorites';
import { layout, makeStyles, spacing, useTheme } from '@/theme';
import type { Property } from '@/types/domain';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

const SKELETON_COUNT = 2;

export default function FavoritesScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const ids = useFavoritesStore((s) => s.ids);
  const sync = useFavoritesSync();
  const properties = usePropertiesByIds(ids);
  const cardWidth = width - layout.screenPadding * 2;

  // Порядок как в избранном (последние сверху); снятые с публикации объекты пропадают из выдачи
  const byId = new Map((properties.data ?? []).map((p) => [p.id, p]));
  const items = ids.map((id) => byId.get(id)).filter((p): p is Property => Boolean(p));

  const { refreshing, onRefresh } = usePullToRefresh(() => Promise.all([sync.refetch(), properties.refetch()]));
  useRefreshOnFocus(properties.refetch, ids.length > 0);

  const loading = ids.length > 0 && properties.isPending;

  return (
    <Screen>
      <ScreenHeader
        large
        showBack={false}
        title={t('favorites.title')}
        subtitle={ids.length > 0 ? t('favorites.count', { count: ids.length }) : undefined}
      />
      <FlatList<Property>
        data={loading ? [] : items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <PropertyCard property={item} width={cardWidth} source="favorites" />
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <SkeletonGroup>
              <View style={styles.item}>
                {Array.from({ length: SKELETON_COUNT }, (_, i) => (
                  <View key={i} style={styles.skeleton}>
                    <PropertyCardSkeleton width={cardWidth} />
                  </View>
                ))}
              </View>
            </SkeletonGroup>
          ) : properties.isError && ids.length > 0 ? (
            <EmptyState icon="cloud-offline-outline" title={t('errors.generic')} actionLabel={t('common.retry')} onAction={() => void properties.refetch()} />
          ) : (
            <EmptyState
              icon="heart-outline"
              title={t('favorites.emptyTitle')}
              text={t('favorites.emptyText')}
              actionLabel={t('favorites.browse')}
              onAction={() => router.push('/catalog')}
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
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  item: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.lg,
  },
  skeleton: {
    marginBottom: spacing.lg,
  },
}));
