import { type InfiniteData, keepPreviousData, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';

import { qk } from '@/query/keys';
import { api } from '@/services/api';
import type { CatalogFilters } from '@/store/filters';
import type { Complex, DealType, Page, Property } from '@/types/domain';

export function useHotProperties() {
  return useQuery({ queryKey: qk.properties.hot, queryFn: api.properties.hot });
}

export function useComplexes() {
  return useQuery({ queryKey: qk.complexes.list, queryFn: api.complexes.list, staleTime: 5 * 60_000 });
}

export function useComplex(id: string, options: { enabled?: boolean } = {}) {
  const client = useQueryClient();
  return useQuery({
    queryKey: qk.complexes.detail(id),
    queryFn: () => api.complexes.get(id),
    enabled: options.enabled ?? true,
    initialData: () => client.getQueryData<Complex[]>(qk.complexes.list)?.find((c) => c.id === id),
    initialDataUpdatedAt: () => client.getQueryState(qk.complexes.list)?.dataUpdatedAt,
  });
}

export function useComplexListings(id: string) {
  return useQuery({ queryKey: qk.complexes.listings(id), queryFn: () => api.complexes.listings(id) });
}

export function useCatalog(filters: CatalogFilters) {
  return useInfiniteQuery({
    queryKey: qk.properties.list(filters),
    queryFn: ({ pageParam }) => api.properties.list(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last: Page<Property>) => last.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  });
}

export function useCatalogCount(filters: CatalogFilters, enabled: boolean) {
  return useQuery({
    queryKey: qk.properties.count(filters),
    queryFn: () => api.properties.count(filters),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useMapPins(filters: CatalogFilters, enabled: boolean) {
  return useQuery({
    queryKey: qk.properties.map(filters),
    queryFn: () => api.properties.mapPins(filters),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function usePriceHistogram(dealType: DealType) {
  return useQuery({ queryKey: qk.properties.histogram(dealType), queryFn: () => api.properties.histogram(dealType), staleTime: 5 * 60_000 });
}

/** Ищем объект в уже загруженных списках — экран деталей открывается мгновенно. */
function findCachedProperty(client: ReturnType<typeof useQueryClient>, id: string): Property | undefined {
  const lists = client.getQueriesData<InfiniteData<Page<Property>> | Property[]>({ queryKey: qk.properties.all });
  for (const [, data] of lists) {
    if (!data) continue;
    if (Array.isArray(data)) {
      const hit = data.find((p) => p.id === id);
      if (hit) return hit;
    } else if ('pages' in data) {
      for (const page of data.pages) {
        const hit = page.items.find((p) => p.id === id);
        if (hit) return hit;
      }
    }
  }
  return undefined;
}

export function useProperty(id: string, options: { enabled?: boolean } = {}) {
  const client = useQueryClient();
  return useQuery({
    queryKey: qk.properties.detail(id),
    queryFn: () => api.properties.get(id),
    enabled: options.enabled ?? true,
    placeholderData: () => findCachedProperty(client, id),
  });
}

export function useSimilarProperties(id: string) {
  return useQuery({ queryKey: qk.properties.similar(id), queryFn: () => api.properties.similar(id) });
}

export function usePropertiesByIds(ids: string[]) {
  return useQuery({
    queryKey: qk.properties.byIds(ids),
    queryFn: () => api.properties.byIds(ids),
    enabled: ids.length > 0,
    placeholderData: keepPreviousData,
  });
}
