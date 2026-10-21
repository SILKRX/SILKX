import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { type MapPressEvent, Marker, type MarkerDragStartEndEvent, PROVIDER_GOOGLE } from 'react-native-maps';

import { useMarkerTracking } from '@/components/catalog/useMarkerTracking';
import { Icon } from '@/components/ui';
import { MAP_DELTA, TASHKENT_CENTER } from '@/constants/districts';
import { layout, makeStyles, motion, radii, sizes, useTheme } from '@/theme';
import { darkMapStyle, lightMapStyle } from '@/theme/mapStyle';
import type { Coordinates } from '@/types/domain';

const PIN_ANCHOR = { x: 0.5, y: 1 };

interface LocationPickerProps {
  value: Coordinates | null;
  onChange: (coords: Coordinates) => void;
}

/** Карта с перетаскиваемым пином: точная точка объекта (тап по карте тоже переносит пин). */
export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const styles = useStyles();
  const { colors, isDark } = useTheme();
  const mapRef = useRef<MapView>(null);
  const tracking = useMarkerTracking(isDark);
  const coords = value ?? TASHKENT_CENTER;

  // Выбрали адрес из подсказок — плавно переводим камеру
  useEffect(() => {
    if (!value) return;
    mapRef.current?.animateToRegion(
      { latitude: value.latitude, longitude: value.longitude, latitudeDelta: MAP_DELTA.building, longitudeDelta: MAP_DELTA.building },
      motion.mapCamera,
    );
  }, [value]);

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{ ...coords, latitudeDelta: value ? MAP_DELTA.building : MAP_DELTA.city, longitudeDelta: value ? MAP_DELTA.building : MAP_DELTA.city }}
        customMapStyle={isDark ? darkMapStyle : lightMapStyle}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
        showsPointsOfInterests={false}
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        onPress={(event: MapPressEvent) => onChange(event.nativeEvent.coordinate)}
      >
        <Marker
          coordinate={coords}
          anchor={PIN_ANCHOR}
          draggable
          tracksViewChanges={tracking}
          onDragEnd={(event: MarkerDragStartEndEvent) => onChange(event.nativeEvent.coordinate)}
        >
          <View style={styles.pin}>
            <Icon name="home" size="sm" color={colors.textOnGold} />
          </View>
        </Marker>
      </MapView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    height: layout.masterPlanHeight,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: t.colors.surfaceMuted,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  pin: {
    width: sizes.iconButton.md,
    height: sizes.iconButton.md,
    borderRadius: radii.pill,
    backgroundColor: t.colors.gold,
    borderWidth: sizes.borderStrong,
    borderColor: t.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
