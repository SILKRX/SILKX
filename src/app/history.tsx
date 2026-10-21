import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, useWindowDimensions, View } from 'react-native';

import { PropertyCardCompact } from '@/components/property/PropertyCard';
import { Button, EmptyState, Screen, ScreenHeader, Skeleton, SkeletonGroup, Text } from '@/components/ui';
import { usePropertiesByIds } from '@/hooks/api/catalog';
import { formatRelativeTime } from '@/lib/format';
import { useHistoryStore } from '@/store/history';
import { toast } from '@/store/toast';
import { layout, makeStyles, radii, spacing } from '@/theme';
import type { Property } from '@/types/domain';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

const SKELETON_COUNT = 4;

interface Row {
  property: Property;
  viewedAt: string;
}

/** История просмотров хранится локально (офлайн, без входа) — последние 60 объектов. */
export default function HistoryScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const entries = useHistoryStore((s) => s.entries);
  const clear = useHistoryStore((s) => s.clear);
  const properties = usePropertiesByIds(entries.map((e) => e.id));
  const byId = new Map((properties.data ?? []).map((p) => [p.id, p]));
  const rows: Row[] = entries.flatMap((entry) => {
    const property = byId.get(entry.id);
    return property ? [{ property, viewedAt: entry.viewedAt }] : [];
  });
  const loading = entries.length > 0 && properties.isPending;
  const cardWidth = width - layout.screenPadding * 2;

  return (
    <Screen>
      <ScreenHeader
        title={t('history.title')}
        right={
          entries.length > 0 ? (
            <Button
              title={t('history.clear')}
              variant="ghost"
              size="sm"
              onPress={() => {
                clear();
                toast.info(t('history.cleared'));
              }}
            />
          ) : null
        }
      />
      <FlatList<Row>
        data={loading ? [] : rows}
        keyExtractor={(row) => row.property.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text variant="caption" color="tertiary">
              {formatRelativeTime(item.viewedAt, t)}
            </Text>
            <PropertyCardCompact property={item.property} width={cardWidth} horizontal source="history" />
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <SkeletonGroup>
              <View style={styles.skeletons}>
                {Array.from({ length: SKELETON_COUNT }, (_, i) => (
                  <Skeleton key={i} height={layout.mapCardHeight} radius={radii.xl} />
                ))}
              </View>
            </SkeletonGroup>
          ) : (
            <EmptyState
              icon="time-outline"
              title={t('history.emptyTitle')}
              text={t('history.emptyText')}
              actionLabel={t('favorites.browse')}
              onAction={() => router.push('/catalog')}
            />
          )
        }
        contentContainerStyle={styles.content}
      />
    </Screen>
  );
}

const useStyles = makeStyles(() => ({
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  row: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  skeletons: {
    gap: spacing.lg,
  },
}));
