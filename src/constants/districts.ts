import type { Coordinates, DistrictId } from '@/types/domain';

export interface DistrictMeta {
  id: DistrictId;
  center: Coordinates;
}

/** 12 районов Ташкента. Подписи — через i18n (`districts.<id>`). */
export const DISTRICTS: readonly DistrictMeta[] = [
  { id: 'mirzo-ulugbek', center: { latitude: 41.3385, longitude: 69.3348 } },
  { id: 'yunusabad', center: { latitude: 41.3667, longitude: 69.2866 } },
  { id: 'chilanzar', center: { latitude: 41.2852, longitude: 69.2047 } },
  { id: 'yakkasaray', center: { latitude: 41.2899, longitude: 69.2588 } },
  { id: 'mirabad', center: { latitude: 41.2953, longitude: 69.2861 } },
  { id: 'shaykhantahur', center: { latitude: 41.3229, longitude: 69.2402 } },
  { id: 'almazar', center: { latitude: 41.3497, longitude: 69.2214 } },
  { id: 'sergeli', center: { latitude: 41.2253, longitude: 69.2206 } },
  { id: 'uchtepa', center: { latitude: 41.2997, longitude: 69.1708 } },
  { id: 'bektemir', center: { latitude: 41.2093, longitude: 69.3352 } },
  { id: 'yashnabad', center: { latitude: 41.2905, longitude: 69.3297 } },
  { id: 'yangihayot', center: { latitude: 41.2006, longitude: 69.1902 } },
] as const;

export const DISTRICT_IDS: readonly DistrictId[] = DISTRICTS.map((d) => d.id);

export const TASHKENT_CENTER: Coordinates = { latitude: 41.3111, longitude: 69.2797 };

/** Масштаб карты: весь город / район / конкретный дом (latitudeDelta). */
export const MAP_DELTA = {
  city: 0.16,
  district: 0.045,
  building: 0.012,
} as const;

export function isDistrictId(value: string): value is DistrictId {
  return DISTRICT_IDS.includes(value as DistrictId);
}

export function districtCenter(id: DistrictId): Coordinates {
  return DISTRICTS.find((d) => d.id === id)?.center ?? TASHKENT_CENTER;
}
