import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { STORAGE_KEYS, zustandStorage } from '@/lib/storage';
import type { DealType, DistrictId, PropertyType, Renovation } from '@/types/domain';

export type SortKey = 'recommended' | 'priceAsc' | 'priceDesc' | 'newest' | 'area';

export const ROOM_FILTER_VALUES = [0, 1, 2, 3, 4] as const;
export type RoomFilter = (typeof ROOM_FILTER_VALUES)[number];

export interface CatalogFilters {
  dealType: DealType;
  districts: DistrictId[];
  priceMin: number | null;
  priceMax: number | null;
  types: PropertyType[];
  /** 0 — студия, 4 — «4+» */
  rooms: RoomFilter[];
  floorMin: number | null;
  floorMax: number | null;
  notFirst: boolean;
  notLast: boolean;
  renovations: Renovation[];
  installment: boolean;
  query: string;
  sort: SortKey;
}

export const DEFAULT_FILTERS: CatalogFilters = {
  dealType: 'sale',
  districts: [],
  priceMin: null,
  priceMax: null,
  types: [],
  rooms: [],
  floorMin: null,
  floorMax: null,
  notFirst: false,
  notLast: false,
  renovations: [],
  installment: false,
  query: '',
  sort: 'recommended',
};

/** Диапазоны ценового слайдера по типу сделки (USD). */
export const PRICE_RANGES: Record<DealType, { min: number; max: number; step: number }> = {
  sale: { min: 20_000, max: 600_000, step: 5_000 },
  rent: { min: 200, max: 4_000, step: 50 },
};

/** Сколько фильтров сужают выдачу (тип сделки, сортировка и поиск — не считаются). */
export function countActiveFilters(f: CatalogFilters): number {
  let count = 0;
  if (f.districts.length) count += 1;
  if (f.priceMin !== null || f.priceMax !== null) count += 1;
  if (f.types.length) count += 1;
  if (f.rooms.length) count += 1;
  if (f.floorMin !== null || f.floorMax !== null || f.notFirst || f.notLast) count += 1;
  if (f.renovations.length) count += 1;
  if (f.installment) count += 1;
  return count;
}

interface FiltersState {
  filters: CatalogFilters;
  setFilters: (patch: Partial<CatalogFilters>) => void;
  replace: (filters: CatalogFilters) => void;
  reset: () => void;
}

export const useFiltersStore = create<FiltersState>()(
  persist(
    (set) => ({
      filters: DEFAULT_FILTERS,
      setFilters: (patch) =>
        set((s) => {
          const next = { ...s.filters, ...patch };
          // при смене типа сделки ценовой диапазон другого масштаба теряет смысл
          if (patch.dealType && patch.dealType !== s.filters.dealType) {
            next.priceMin = null;
            next.priceMax = null;
          }
          return { filters: next };
        }),
      replace: (filters) => set({ filters }),
      reset: () => set((s) => ({ filters: { ...DEFAULT_FILTERS, dealType: s.filters.dealType, query: s.filters.query } })),
    }),
    { name: STORAGE_KEYS.filters, storage: zustandStorage, version: 1 },
  ),
);
