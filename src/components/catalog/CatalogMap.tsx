import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, type NativeScrollEvent, type NativeSyntheticEvent, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { PropertyCardCompact } from '@/components/property/PropertyCard';
import { Button, EmptyState, Text } from '@/components/ui';
import { useMapPins } from '@/hooks/api/catalog';
import { analytics } from '@/lib/analytics';
import { haptics } from '@/lib/haptics';
import type { CatalogFilters } from '@/store/filters';
import { layout, makeStyles, motion, radii, sizes, spacing } from '@/theme';
import type { Property } from '@/types/domain';

import { PropertyMap } from './PropertyMap';
import type { PropertyMapHandle } from './PropertyMap.types';

const INITIAL_CARDS = 3;
const WINDOW_SIZE = 5;

interface CatalogMapProps {
  filters: CatalogFilters;
  onResetFilters: () => void;
}

/**
 * Режим «Карта»: маркеры с ценами + карусель карточек снизу.
 * Тап по маркеру прокручивает карусель к объекту, свайп карусели — двигает карту.
 */
export function CatalogMap({ filters, onResetFilters }: CatalogMapProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const pins = useMapPins(filters, true);
  const properties = pins.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mapRef = useRef<PropertyMapHandle>(null);
  const listRef = useRef<FlatList<Property>>(null);

  const cardWidth = Math.round(width * layout.mapCardRatio);
  const interval = cardWidth + spacing.md;
  const carouselHeight = layout.mapCardHeight + spacing.lg * 2;
  const activeId = selectedId && properties.some((p) => p.id === selectedId) ? selectedId : null;

  const selectFromMap = (id: string) => {
    analytics.track('map_marker_tapped', { propertyId: id });
    haptics.selection();
    setSelectedId(id);
    const index = properties.findIndex((p) => p.id === id);
    if (index >= 0) listRef.current?.scrollToOffset({ offset: index * interval, animated: true });
  };

  const onCarouselSettled = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / interval);
    const item = properties[Math.min(Math.max(index, 0), properties.length - 1)];
    if (!item || item.id === activeId) return;
    setSelectedId(item.id);
    mapRef.current?.focus(item.id);
  };

  return (
    <View style={styles.root}>
      <PropertyMap
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        properties={properties}
        selectedId={activeId}
        onSelect={selectFromMap}
        onMapPress={() => setSelectedId(null)}
        bottomInset={carouselHeight}
      />

      {pins.isFetching ? (
        <Animated.View entering={FadeIn.duration(motion.fast)} exiting={FadeOut.duration(motion.fast)} style={styles.loadingPill} pointerEvents="none">
          <Text variant="caption">{t('common.loading')}</Text>
        </Animated.View>
      ) : null}

      {!pins.isPending && properties.length === 0 ? (
        <View style={styles.emptyCard}>
          <EmptyState compact icon="map-outline" title={t('catalog.emptyTitle')} text={t('catalog.emptyText')} />
          <Button title={t('catalog.resetFilters')} variant="outline" onPress={onResetFilters} style={styles.emptyButton} />
        </View>
      ) : null}

      <View style={[styles.carousel, { height: carouselHeight }]} pointerEvents="box-none">
        <FlatList<Property>
          ref={listRef}
          horizontal
          data={properties}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View>
              <PropertyCardCompact property={item} width={cardWidth} horizontal source="map" />
              {item.id === activeId ? <View style={[StyleSheet.absoluteFill, styles.activeRing]} pointerEvents="none" /> : null}
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsHorizontalScrollIndicator={false}
          snapToInterval={interval}
          decelerationRate="fast"
          contentContainerStyle={styles.carouselContent}
          onMomentumScrollEnd={onCarouselSettled}
          getItemLayout={(_, index) => ({ length: interval, offset: interval * index, index })}
          initialNumToRender={INITIAL_CARDS}
          windowSize={WINDOW_SIZE}
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    flex: 1,
  },
  loadingPill: {
    position: 'absolute',
    top: spacing.md,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + spacing.xxs,
    borderRadius: radii.pill,
    backgroundColor: t.colors.surfaceElevated,
  },
  emptyCard: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    top: spacing.xxxl,
    paddingBottom: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: t.colors.surfaceElevated,
    alignItems: 'center',
  },
  emptyButton: {
    alignSelf: 'center',
  },
  carousel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  carouselContent: {
    paddingHorizontal: spacing.lg,
  },
  separator: {
    width: spacing.md,
  },
  activeRing: {
    borderRadius: radii.xl,
    borderWidth: sizes.borderStrong,
    borderColor: t.colors.gold,
  },
}));
