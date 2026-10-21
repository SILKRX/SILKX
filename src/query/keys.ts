import type { CatalogFilters } from '@/store/filters';
import type { DealType } from '@/types/domain';

/** Фабрика ключей React Query: единые ключи для запросов, инвалидаций и оптимистичных апдейтов. */
export const qk = {
  properties: {
    all: ['properties'] as const,
    list: (filters: CatalogFilters) => ['properties', 'list', filters] as const,
    count: (filters: CatalogFilters) => ['properties', 'count', filters] as const,
    map: (filters: CatalogFilters) => ['properties', 'map', filters] as const,
    histogram: (dealType: DealType) => ['properties', 'histogram', dealType] as const,
    detail: (id: string) => ['properties', 'detail', id] as const,
    byIds: (ids: string[]) => ['properties', 'byIds', ids] as const,
    hot: ['properties', 'hot'] as const,
    similar: (id: string) => ['properties', 'similar', id] as const,
  },
  complexes: {
    all: ['complexes'] as const,
    list: ['complexes', 'list'] as const,
    detail: (id: string) => ['complexes', 'detail', id] as const,
    listings: (id: string) => ['complexes', 'listings', id] as const,
  },
  favorites: (userId: string) => ['favorites', userId] as const,
  viewings: {
    mine: (userId: string) => ['viewings', 'mine', userId] as const,
    slots: (propertyId: string) => ['viewings', 'slots', propertyId] as const,
    schedule: (userId: string) => ['viewings', 'schedule', userId] as const,
  },
  chat: {
    list: (userId: string) => ['chat', 'list', userId] as const,
    conversation: (id: string) => ['chat', 'conversation', id] as const,
    messages: (id: string) => ['chat', 'messages', id] as const,
  },
  notifications: (userId: string) => ['notifications', userId] as const,
  seller: {
    listings: (userId: string) => ['seller', 'listings', userId] as const,
    stats: (userId: string) => ['seller', 'stats', userId] as const,
  },
  admin: {
    overview: ['admin', 'overview'] as const,
    queue: ['admin', 'queue'] as const,
    users: (query: string) => ['admin', 'users', query] as const,
    logs: (userId: string) => ['admin', 'logs', userId] as const,
  },
  geo: (query: string) => ['geo', query] as const,
  flags: ['flags'] as const,
};
