import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { useMarkerTracking } from '@/components/catalog/useMarkerTracking';
import { Icon, Text } from '@/components/ui';
import { MAP_DELTA } from '@/constants/districts';
import { openInMaps } from '@/lib/linking';
import { elevation, layout, makeStyles, radii, sizes, spacing, useTheme } from '@/theme';
import { darkMapStyle, lightMapStyle } from '@/theme/mapStyle';
import type { Coordinates } from '@/types/domain';

const PIN_ANCHOR = { x: 0.5, y: 0.5 };

/** Мини-карта на экране объекта: статичная, по тапу открывает системные карты. */
export function MiniMap({ coords, label }: { coords: Coordinates; label: string }) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const tracking = useMarkerTracking(isDark);

  return (
    <Pressable
      onPress={() => void openInMaps(coords, label)}
      style={styles.root}
      accessibilityRole="button"
      accessibilityLabel={t('property.openInMaps')}
    >
      <MapView
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        liteMode
        initialRegion={{ ...coords, latitudeDelta: MAP_DELTA.building, longitudeDelta: MAP_DELTA.building }}
        customMapStyle={isDark ? darkMapStyle : lightMapStyle}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        showsPointsOfInterests={false}
      >
        <Marker coordinate={coords} anchor={PIN_ANCHOR} tracksViewChanges={tracking}>
          <View style={styles.pin}>
            <Icon name="home" size="sm" color={colors.textOnGold} />
          </View>
        </Marker>
      </MapView>
      <View style={styles.pill} pointerEvents="none">
        <Icon name="navigate-outline" size="xs" color={colors.gold} />
        <Text variant="caption">{t('property.openInMaps')}</Text>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    height: layout.miniMapHeight,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: t.colors.surfaceMuted,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  pin: {
    width: sizes.iconButton.sm,
    height: sizes.iconButton.sm,
    borderRadius: radii.pill,
    backgroundColor: t.colors.gold,
    borderWidth: sizes.borderStrong,
    borderColor: t.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.gold,
  },
  pill: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + spacing.xxs,
    borderRadius: radii.pill,
    backgroundColor: t.colors.surfaceElevated,
    ...elevation.card,
  },
}));
