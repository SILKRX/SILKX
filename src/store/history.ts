import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { STORAGE_KEYS, zustandStorage } from '@/lib/storage';

export interface HistoryEntry {
  id: string;
  viewedAt: string;
}

const MAX_ENTRIES = 60;

interface HistoryState {
  entries: HistoryEntry[];
  track: (id: string) => void;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      entries: [],
      track: (id) =>
        set((s) => ({
          entries: [{ id, viewedAt: new Date().toISOString() }, ...s.entries.filter((e) => e.id !== id)].slice(0, MAX_ENTRIES),
        })),
      clear: () => set({ entries: [] }),
    }),
    { name: STORAGE_KEYS.history, storage: zustandStorage, version: 1 },
  ),
);
