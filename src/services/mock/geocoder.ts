import type { Coordinates, DistrictId } from '@/types/domain';

export interface AddressSuggestion {
  id: string;
  label: string;
  district: DistrictId;
  coords: Coordinates;
}

/** Мини-геокодер по улицам и ориентирам Ташкента (в продакшене — Google Places / Yandex Geocoder). */
const PLACES: AddressSuggestion[] = [
  { id: 'g1', label: 'ул. Амира Темура', district: 'yunusabad', coords: { latitude: 41.3535, longitude: 69.2868 } },
  { id: 'g2', label: 'ул. Мирзо Улугбека', district: 'mirzo-ulugbek', coords: { latitude: 41.3402, longitude: 69.3311 } },
  { id: 'g3', label: 'ул. Буюк Ипак Йули', district: 'mirzo-ulugbek', coords: { latitude: 41.3271, longitude: 69.3389 } },
  { id: 'g4', label: 'ул. Шота Руставели', district: 'yakkasaray', coords: { latitude: 41.2883, longitude: 69.2598 } },
  { id: 'g5', label: 'ул. Бобура', district: 'yakkasaray', coords: { latitude: 41.2922, longitude: 69.2551 } },
  { id: 'g6', label: 'ул. Шахрисабз', district: 'mirabad', coords: { latitude: 41.2978, longitude: 69.2834 } },
  { id: 'g7', label: 'ул. Афросиаб', district: 'mirabad', coords: { latitude: 41.2991, longitude: 69.2744 } },
  { id: 'g8', label: 'ул. Навои', district: 'shaykhantahur', coords: { latitude: 41.3207, longitude: 69.2457 } },
  { id: 'g9', label: 'ул. Бунёдкор', district: 'chilanzar', coords: { latitude: 41.2846, longitude: 69.2136 } },
  { id: 'g10', label: 'Чиланзар-9', district: 'chilanzar', coords: { latitude: 41.2791, longitude: 69.1982 } },
  { id: 'g11', label: 'ул. Махтумкули', district: 'yashnabad', coords: { latitude: 41.2953, longitude: 69.3321 } },
  { id: 'g12', label: 'ул. Янги Сергели', district: 'sergeli', coords: { latitude: 41.2258, longitude: 69.2181 } },
  { id: 'g13', label: 'ул. Лутфий', district: 'uchtepa', coords: { latitude: 41.3012, longitude: 69.1735 } },
  { id: 'g14', label: 'ул. Шифокорлар', district: 'almazar', coords: { latitude: 41.3481, longitude: 69.2202 } },
  { id: 'g15', label: 'ул. Хусайн Байкаро', district: 'bektemir', coords: { latitude: 41.2109, longitude: 69.3331 } },
  { id: 'g16', label: 'ул. Янгихаёт', district: 'yangihayot', coords: { latitude: 41.2017, longitude: 69.1911 } },
  { id: 'g17', label: 'ул. Осиё', district: 'yunusabad', coords: { latitude: 41.3693, longitude: 69.2799 } },
  { id: 'g18', label: 'Tashkent City', district: 'shaykhantahur', coords: { latitude: 41.3151, longitude: 69.2484 } },
  { id: 'g19', label: 'Мирабадский рынок', district: 'mirabad', coords: { latitude: 41.2958, longitude: 69.2789 } },
  { id: 'g20', label: 'Парк Бабура', district: 'yakkasaray', coords: { latitude: 41.2873, longitude: 69.2519 } },
  { id: 'g21', label: 'Юнусабад-4', district: 'yunusabad', coords: { latitude: 41.3651, longitude: 69.2903 } },
  { id: 'g22', label: 'Университетская ул.', district: 'mirzo-ulugbek', coords: { latitude: 41.3497, longitude: 69.2042 } },
  { id: 'g23', label: 'ул. Мукими', district: 'chilanzar', coords: { latitude: 41.2902, longitude: 69.2319 } },
  { id: 'g24', label: 'ул. Нукус', district: 'mirabad', coords: { latitude: 41.2911, longitude: 69.2701 } },
];

export function searchPlaces(query: string, limit = 6): AddressSuggestion[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return PLACES.filter((p) => p.label.toLowerCase().includes(q)).slice(0, limit);
}

/** Ближайший район к точке (для пина на карте). */
export function nearestPlace(coords: Coordinates): AddressSuggestion {
  let best = PLACES[0] as AddressSuggestion;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const p of PLACES) {
    const d = (p.coords.latitude - coords.latitude) ** 2 + (p.coords.longitude - coords.longitude) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}
