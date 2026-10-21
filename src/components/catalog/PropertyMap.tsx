import { memo, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Platform } from 'react-native';
import MapView, { type MapPressEvent, Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';

import { MAP_DELTA, TASHKENT_CENTER } from '@/constants/districts';
import { layout, motion, useTheme, zIndex } from '@/theme';
import { darkMapStyle, lightMapStyle } from '@/theme/mapStyle';
import type { Property } from '@/types/domain';

import { markerLabel, PriceMarker } from './PriceMarker';
import type { PropertyMapProps } from './PropertyMap.types';
import { useMarkerTracking } from './useMarkerTracking';

const CITY_REGION: Region = {
  latitude: TASHKENT_CENTER.latitude,
  longitude: TASHKENT_CENTER.longitude,
  latitudeDelta: MAP_DELTA.city,
  longitudeDelta: MAP_DELTA.city,
};

const MARKER_ANCHOR = { x: 0.5, y: 1 };

interface MarkerProps {
  property: Property;
  selected: boolean;
  onSelect: (id: string) => void;
}

/**
 * Кастомный маркер. На Android снимок view кэшируется (tracksViewChanges=false) —
 * иначе карта с десятками маркеров тормозит. После смены состояния даём ему
 * короткое окно на перерисовку.
 */
const PropertyMarker = memo(function PropertyMarker({ property, selected, onSelect }: MarkerProps) {
  const tracking = useMarkerTracking(selected);

  return (
    <Marker
      identifier={property.id}
      coordinate={property.coords}
      anchor={MARKER_ANCHOR}
      tracksViewChanges={tracking}
      zIndex={selected ? zIndex.raised : zIndex.base}
      onPress={() => onSelect(property.id)}
    >
      <PriceMarker label={markerLabel(property)} selected={selected} />
    </Marker>
  );
});

/** Карта каталога: маркеры-цены, стиль под тему, управление камерой снаружи через ref. */
export function PropertyMap({ ref, properties, selectedId, onSelect, onMapPress, bottomInset = 0, style }: PropertyMapProps) {
  const { isDark } = useTheme();
  const mapRef = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const fittedFor = useRef<readonly Property[] | null>(null);

  const fitAll = () => {
    if (properties.length === 0) return;
    mapRef.current?.fitToCoordinates(
      properties.map((p) => p.coords),
      {
        edgePadding: {
          top: layout.mapEdgePadding,
          right: layout.mapEdgePadding,
          bottom: layout.mapEdgePadding + bottomInset,
          left: layout.mapEdgePadding,
        },
        animated: true,
      },
    );
  };

  useImperativeHandle(ref, () => ({
    focus: (id: string) => {
      const target = properties.find((p) => p.id === id);
      if (!target) return;
      mapRef.current?.animateToRegion(
        {
          latitude: target.coords.latitude,
          longitude: target.coords.longitude,
          latitudeDelta: MAP_DELTA.district,
          longitudeDelta: MAP_DELTA.district,
        },
        motion.mapCamera,
      );
    },
    fitAll,
  }));

  // Новая выдача (сменились фильтры) — один раз подгоняем камеру под все маркеры
  useEffect(() => {
    if (!ready || properties.length === 0 || fittedFor.current === properties) return;
    fittedFor.current = properties;
    fitAll();
  }, [ready, properties, fitAll]);

  const handlePress = (event: MapPressEvent) => {
    // На iOS тап по маркеру дублируется событием карты — его игнорируем
    if (event.nativeEvent.action === 'marker-press') return;
    onMapPress?.();
  };

  return (
    <MapView
      ref={mapRef}
      style={style}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      initialRegion={CITY_REGION}
      customMapStyle={isDark ? darkMapStyle : lightMapStyle}
      userInterfaceStyle={isDark ? 'dark' : 'light'}
      showsPointsOfInterests={false}
      showsCompass={false}
      toolbarEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      moveOnMarkerPress={false}
      mapPadding={{ top: 0, right: 0, bottom: bottomInset, left: 0 }}
      onMapReady={() => setReady(true)}
      onPress={handlePress}
    >
      {properties.map((property) => (
        <PropertyMarker key={property.id} property={property} selected={property.id === selectedId} onSelect={onSelect} />
      ))}
    </MapView>
  );
}
