import type { TFunction } from 'i18next';

import { formatArea, formatUSD, pricePerM2 } from '@/lib/format';
import type { Property, PropertyType, Renovation } from '@/types/domain';

const PROPERTY_TYPE_KEYS = {
  apartment: 'propertyType.apartment',
  house: 'propertyType.house',
  townhouse: 'propertyType.townhouse',
  commercial: 'propertyType.commercial',
} as const satisfies Record<PropertyType, string>;

const RENOVATION_KEYS = {
  shell: 'renovation.shell',
  whitebox: 'renovation.whitebox',
  euro: 'renovation.euro',
  designer: 'renovation.designer',
} as const satisfies Record<Renovation, string>;

export function propertyTypeLabel(type: PropertyType, t: TFunction): string {
  return t(PROPERTY_TYPE_KEYS[type]);
}

export function renovationLabel(renovation: Renovation, t: TFunction): string {
  return t(RENOVATION_KEYS[renovation]);
}

export function roomsLabel(rooms: number, t: TFunction): string {
  return rooms === 0 ? t('rooms.studio') : t('rooms.short', { count: rooms });
}

/** Заголовок на языке интерфейса: «2-комн. квартира · 68 м²», «Studio · 30 m²». */
export function propertyTitle(p: Pick<Property, 'type' | 'rooms' | 'area'>, t: TFunction): string {
  const area = `${formatArea(p.area)} ${t('units.sqm')}`;
  if (p.type === 'apartment') {
    if (p.rooms === 0) return `${t('rooms.studio')} · ${area}`;
    return `${roomsLabel(p.rooms, t)} ${propertyTypeLabel(p.type, t).toLocaleLowerCase()} · ${area}`;
  }
  return `${propertyTypeLabel(p.type, t)} · ${area}`;
}

/** «$98 000» для продажи, «$650/мес» для аренды. */
export function priceLabel(p: Pick<Property, 'price' | 'dealType'>, t: TFunction): string {
  return p.dealType === 'rent' ? `${formatUSD(p.price)}${t('units.perMonth')}` : formatUSD(p.price);
}

export function perM2Label(p: Pick<Property, 'price' | 'area' | 'dealType'>, t: TFunction): string | null {
  if (p.dealType === 'rent') return null;
  return t('property.perM2', { price: formatUSD(pricePerM2(p.price, p.area)) });
}

export function floorLabel(p: Pick<Property, 'floor' | 'floorsTotal'>, t: TFunction): string {
  return t('property.floorOf', { floor: p.floor, total: p.floorsTotal });
}

export function priceDropPercent(p: Pick<Property, 'price' | 'previousPrice'>): number | null {
  if (!p.previousPrice || p.previousPrice <= p.price) return null;
  return Math.round(((p.previousPrice - p.price) / p.previousPrice) * 100);
}
