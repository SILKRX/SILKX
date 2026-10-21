import { ApiError } from '@/lib/errors';
import { type CatalogFilters, PRICE_RANGES } from '@/store/filters';
import type { Complex, Coordinates, DealType, Page, PriceBucket, Property } from '@/types/domain';

import { matchesFilters, priceHistogram, sortProperties } from '../mock/catalog';
import { hydrateComplex, hydrateProperty } from '../mock/db';
import { type AddressSuggestion, nearestPlace, searchPlaces } from '../mock/geocoder';
import type { MockDatabase, PropertyRecord } from '../mock/types';
import { authedRequest, request } from './client';

export const CATALOG_PAGE_SIZE = 10;
const MAP_PINS_LIMIT = 200;
const HISTOGRAM_BUCKETS = 28;

function matched(db: MockDatabase, filters: CatalogFilters): PropertyRecord[] {
  return sortProperties(
    db.properties.filter((p) => matchesFilters(p, filters, db.complexes)),
    filters.sort,
  );
}

export const propertiesApi = {
  list: (filters: CatalogFilters, cursor = 0) =>
    request<Page<Property>>((db) => {
      const all = matched(db, filters);
      const items = all.slice(cursor, cursor + CATALOG_PAGE_SIZE).map((p) => hydrateProperty(db, p));
      const next = cursor + CATALOG_PAGE_SIZE;
      return { items, total: all.length, nextCursor: next < all.length ? next : null };
    }),

  count: (filters: CatalogFilters) =>
    request<number>((db) => matched(db, filters).length, { latency: [90, 220] }),

  mapPins: (filters: CatalogFilters) =>
    request<Property[]>((db) =>
      matched(db, filters)
        .slice(0, MAP_PINS_LIMIT)
        .map((p) => hydrateProperty(db, p)),
    ),

  histogram: (dealType: DealType) =>
    request<PriceBucket[]>(
      (db) => priceHistogram(db.properties, dealType, PRICE_RANGES[dealType], HISTOGRAM_BUCKETS),
      { latency: [90, 220] },
    ),

  get: (id: string) =>
    request<Property>(
      (db) => {
        const record = db.properties.find((p) => p.id === id);
        if (!record) throw new ApiError('NOT_FOUND');
        record.views += 1;
        return hydrateProperty(db, record);
      },
      { mutates: true },
    ),

  byIds: (ids: string[]) =>
    request<Property[]>((db) =>
      ids
        .map((id) => db.properties.find((p) => p.id === id))
        .filter((p): p is PropertyRecord => Boolean(p))
        .map((p) => hydrateProperty(db, p)),
    ),

  hot: () =>
    request<Property[]>((db) =>
      sortProperties(
        db.properties.filter((p) => p.status === 'active' && (p.isHot || p.promotion === 'vip')),
        'recommended',
      )
        .slice(0, 10)
        .map((p) => hydrateProperty(db, p)),
    ),

  similar: (id: string) =>
    request<Property[]>((db) => {
      const base = db.properties.find((p) => p.id === id);
      if (!base) return [];
      return db.properties
        .filter(
          (p) =>
            p.id !== base.id &&
            p.status === 'active' &&
            p.dealType === base.dealType &&
            (p.district === base.district || Math.abs(p.rooms - base.rooms) <= 1),
        )
        .sort((a, b) => Math.abs(a.price - base.price) - Math.abs(b.price - base.price))
        .slice(0, 8)
        .map((p) => hydrateProperty(db, p));
    }),

  /** Звонок продавцу — учитывается в статистике «конверсия в звонки». */
  recordCall: (id: string) =>
    request<void>(
      (db) => {
        const record = db.properties.find((p) => p.id === id);
        if (record) record.calls += 1;
      },
      { mutates: true, stable: true, latency: [40, 120] },
    ),
};

export const complexesApi = {
  list: () => request<Complex[]>((db) => db.complexes.map((c) => hydrateComplex(db, c))),

  get: (id: string) =>
    request<Complex>((db) => {
      const record = db.complexes.find((c) => c.id === id);
      if (!record) throw new ApiError('NOT_FOUND');
      return hydrateComplex(db, record);
    }),

  listings: (id: string) =>
    request<Property[]>((db) =>
      db.properties.filter((p) => p.complexId === id && p.status === 'active').map((p) => hydrateProperty(db, p)),
    ),
};

export const favoritesApi = {
  list: () => authedRequest<string[]>((db, ctx) => db.favorites[ctx.userId] ?? [], { latency: [150, 320] }),

  set: (propertyId: string, liked: boolean) =>
    authedRequest<boolean>(
      (db, ctx) => {
        const record = db.properties.find((p) => p.id === propertyId);
        if (!record) throw new ApiError('NOT_FOUND');
        const current = new Set(db.favorites[ctx.userId] ?? []);
        if (liked && !current.has(propertyId)) {
          current.add(propertyId);
          record.favoritesCount += 1;
        } else if (!liked && current.has(propertyId)) {
          current.delete(propertyId);
          record.favoritesCount = Math.max(0, record.favoritesCount - 1);
        }
        db.favorites[ctx.userId] = Array.from(current);
        return liked;
      },
      { mutates: true, latency: [180, 450] },
    ),

  /** Объединить гостевое избранное с аккаунтом после входа. */
  merge: (localIds: string[]) =>
    authedRequest<string[]>(
      (db, ctx) => {
        const merged = Array.from(new Set([...(db.favorites[ctx.userId] ?? []), ...localIds])).filter((id) =>
          db.properties.some((p) => p.id === id),
        );
        db.favorites[ctx.userId] = merged;
        return merged;
      },
      { mutates: true, stable: true },
    ),
};

export const geoApi = {
  search: (query: string) => request<AddressSuggestion[]>(() => searchPlaces(query), { latency: [120, 260], stable: true }),
  reverse: (coords: Coordinates) => request<AddressSuggestion>(() => nearestPlace(coords), { latency: [80, 160], stable: true }),
};

export type { AddressSuggestion };
