import { en } from '@/i18n/locales/en';
import { ru } from '@/i18n/locales/ru';
import { uz } from '@/i18n/locales/uz';
import type { CatalogFilters } from '@/store/filters';
import type { DealType, DistrictId, PriceBucket, PromotionTier } from '@/types/domain';

import type { ComplexRecord, PropertyRecord } from './types';

const DISTRICT_ALIASES: Record<DistrictId, string[]> = Object.fromEntries(
  (Object.keys(ru.districts) as DistrictId[]).map((id) => [
    id,
    [id, ru.districts[id], uz.districts[id], en.districts[id]].map((s) => s.toLowerCase()),
  ]),
) as Record<DistrictId, string[]>;

function matchesQuery(record: PropertyRecord, query: string, complexes: ComplexRecord[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const complexName = record.complexId ? (complexes.find((c) => c.id === record.complexId)?.name ?? '') : '';
  const haystack = [record.title, record.address, complexName, ...DISTRICT_ALIASES[record.district]].join(' ').toLowerCase();
  return q.split(/\s+/).every((token) => haystack.includes(token));
}

export function matchesFilters(record: PropertyRecord, f: CatalogFilters, complexes: ComplexRecord[]): boolean {
  if (record.status !== 'active') return false;
  if (record.dealType !== f.dealType) return false;
  if (f.districts.length && !f.districts.includes(record.district)) return false;
  if (f.priceMin !== null && record.price < f.priceMin) return false;
  if (f.priceMax !== null && record.price > f.priceMax) return false;
  if (f.types.length && !f.types.includes(record.type)) return false;
  if (f.rooms.length && !f.rooms.some((r) => (r === 4 ? record.rooms >= 4 : record.rooms === r))) return false;
  if (f.floorMin !== null && record.floor < f.floorMin) return false;
  if (f.floorMax !== null && record.floor > f.floorMax) return false;
  if (f.notFirst && record.floor <= 1) return false;
  if (f.notLast && record.floor >= record.floorsTotal && record.floorsTotal > 1) return false;
  if (f.renovations.length && !f.renovations.includes(record.renovation)) return false;
  if (f.installment && !record.installment) return false;
  return matchesQuery(record, f.query, complexes);
}

const PROMOTION_WEIGHT: Record<PromotionTier, number> = { vip: 3, top: 2, gold: 1 };

export function sortProperties(list: PropertyRecord[], sort: CatalogFilters['sort']): PropertyRecord[] {
  const sorted = [...list];
  switch (sort) {
    case 'priceAsc':
      return sorted.sort((a, b) => a.price - b.price);
    case 'priceDesc':
      return sorted.sort((a, b) => b.price - a.price);
    case 'newest':
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case 'area':
      return sorted.sort((a, b) => b.area - a.area);
    case 'recommended':
      return sorted.sort((a, b) => {
        const promo = (b.promotion ? PROMOTION_WEIGHT[b.promotion] : 0) - (a.promotion ? PROMOTION_WEIGHT[a.promotion] : 0);
        if (promo !== 0) return promo;
        if (a.isHot !== b.isHot) return a.isHot ? -1 : 1;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }
}

/** Гистограмма цен для слайдера фильтра. */
export function priceHistogram(records: PropertyRecord[], dealType: DealType, range: { min: number; max: number }, buckets: number): PriceBucket[] {
  const step = (range.max - range.min) / buckets;
  const result: PriceBucket[] = Array.from({ length: buckets }, (_, i) => ({
    from: Math.round(range.min + i * step),
    to: Math.round(range.min + (i + 1) * step),
    count: 0,
  }));
  for (const r of records) {
    if (r.status !== 'active' || r.dealType !== dealType) continue;
    const index = Math.min(buckets - 1, Math.max(0, Math.floor((r.price - range.min) / step)));
    const bucket = result[index];
    if (bucket) bucket.count += 1;
  }
  return result;
}
