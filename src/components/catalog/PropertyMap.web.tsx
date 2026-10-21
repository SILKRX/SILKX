import { LinearGradient } from 'expo-linear-gradient';
import { useImperativeHandle, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { gradients, makeStyles, opacity, radii, sizes, spacing, useTheme, zIndex } from '@/theme';
import type { Coordinates } from '@/types/domain';

import { markerLabel, PriceMarker } from './PriceMarker';
import type { PropertyMapProps } from './PropertyMap.types';

const GRID_LINES = 6;
const MARKER_HEIGHT = sizes.marker.height + sizes.marker.arrow;

interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

function boundsOf(points: readonly Coordinates[]): Bounds | null {
  if (points.length === 0) return null;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.latitude);
    maxLat = Math.max(maxLat, p.latitude);
    minLng = Math.min(minLng, p.longitude);
    maxLng = Math.max(maxLng, p.longitude);
  }
  return { minLat, maxLat, minLng, maxLng };
}

/**
 * Веб-версия карты: react-native-maps не поддерживает web, поэтому рисуем схему —
 * маркеры в проекции координат на «ночной» фон. Выбор маркера и синхронизация
 * с каруселью работают так же, как на телефоне.
 */
export function PropertyMap({ ref, properties, selectedId, onSelect, onMapPress, bottomInset = 0, style }: PropertyMapProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });

  useImperativeHandle(ref, () => ({ focus: () => undefined, fitAll: () => undefined }));

  const bounds = boundsOf(properties.map((p) => p.coords));
  const pad = sizes.marker.box / 2;
  const usableWidth = Math.max(size.width - pad * 2, 1);
  const usableHeight = Math.max(size.height - bottomInset - pad * 2 - MARKER_HEIGHT, 1);

  const project = (c: Coordinates) => {
    if (!bounds) return { x: size.width / 2, y: size.height / 2 };
    const lngSpan = bounds.maxLng - bounds.minLng || 1;
    const latSpan = bounds.maxLat - bounds.minLat || 1;
    return {
      x: pad + ((c.longitude - bounds.minLng) / lngSpan) * usableWidth,
      y: pad + MARKER_HEIGHT + ((bounds.maxLat - c.latitude) / latSpan) * usableHeight,
    };
  };

  return (
    <Pressable
      style={[styles.root, style]}
      onPress={onMapPress}
      onLayout={(e: LayoutChangeEvent) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
    >
      <LinearGradient colors={gradients.deepBlue} style={StyleSheet.absoluteFill} />
      {Array.from({ length: GRID_LINES }, (_, i) => (
        <View key={`h${i}`} style={[styles.gridH, { top: `${((i + 1) / (GRID_LINES + 1)) * 100}%` }]} />
      ))}
      {Array.from({ length: GRID_LINES }, (_, i) => (
        <View key={`v${i}`} style={[styles.gridV, { left: `${((i + 1) / (GRID_LINES + 1)) * 100}%` }]} />
      ))}
      {size.width > 0
        ? properties.map((property) => {
            const point = project(property.coords);
            const selected = property.id === selectedId;
            return (
              <Pressable
                key={property.id}
                onPress={() => onSelect(property.id)}
                style={[
                  styles.marker,
                  { left: point.x - sizes.marker.box / 2, top: point.y - MARKER_HEIGHT },
                  selected && styles.markerSelected,
                ]}
                accessibilityRole="button"
                accessibilityLabel={markerLabel(property)}
              >
                <PriceMarker label={markerLabel(property)} selected={selected} />
              </Pressable>
            );
          })
        : null}
      <View style={styles.notice} pointerEvents="none">
        <Icon name="information-circle-outline" size="sm" color={colors.gold} />
        <Text variant="caption" color="white" style={styles.noticeText}>
          {t('catalog.mapUnavailable')}
        </Text>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    overflow: 'hidden',
    backgroundColor: t.colors.backgroundAlt,
  },
  gridH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: sizes.divider,
    backgroundColor: t.colors.glassBorder,
    opacity: opacity.faint,
  },
  gridV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: sizes.divider,
    backgroundColor: t.colors.glassBorder,
    opacity: opacity.faint,
  },
  marker: {
    position: 'absolute',
    width: sizes.marker.box,
    alignItems: 'center',
    zIndex: zIndex.base,
  },
  markerSelected: {
    zIndex: zIndex.raised,
  },
  notice: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: t.colors.glassOnImage,
  },
  noticeText: {
    flex: 1,
  },
}));
