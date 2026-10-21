import type { MapStyleElement } from 'react-native-maps';

import { palette } from './tokens';

/**
 * Тёмный стиль Google Maps в палитре SILKX (Android и iOS с PROVIDER_GOOGLE).
 * На iOS с Apple Maps тёмная тема включается через userInterfaceStyle.
 */
export const darkMapStyle: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: palette.ink[800] }] },
  { elementType: 'labels.text.fill', stylers: [{ color: palette.ink[300] }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: palette.ink[900] }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: palette.ink[600] }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: palette.deepBlue[800] }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: palette.ink[700] }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: palette.gold[900] }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: palette.gold[300] }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: palette.deepBlue[900] }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: palette.ink[400] }] },
];

export const lightMapStyle: MapStyleElement[] = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: palette.gold[200] }] },
];
