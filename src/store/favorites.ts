import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { STORAGE_KEYS, zustandStorage } from '@/lib/storage';

interface FavoritesState {
  ids: string[];
  setLiked: (id: string, liked: boolean) => void;
  replaceAll: (ids: string[]) => void;
  clear: () => void;
}

/**
 * Избранное хранится локально (мгновенный UI, работает офлайн и у гостей)
 * и синхронизируется с сервером оптимистичной мутацией (см. hooks/useFavorites).
 */
export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set) => ({
      ids: [],
      setLiked: (id, liked) =>
        set((s) => {
          const has = s.ids.includes(id);
          if (liked && !has) return { ids: [id, ...s.ids] };
          if (!liked && has) return { ids: s.ids.filter((x) => x !== id) };
          return s;
        }),
      replaceAll: (ids) => set({ ids: Array.from(new Set(ids)) }),
      clear: () => set({ ids: [] }),
    }),
    { name: STORAGE_KEYS.favorites, storage: zustandStorage, version: 1 },
  ),
);

export function useIsFavorite(id: string): boolean {
  return useFavoritesStore((s) => s.ids.includes(id));
}
