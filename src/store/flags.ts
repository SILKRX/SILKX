import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { STORAGE_KEYS, zustandStorage } from '@/lib/storage';

/**
 * Feature flags: значения по умолчанию зашиты в приложение, удалённые значения
 * приходят с сервера (remote config) и позволяют выключить сломанную фичу без релиза.
 * Локальные overrides — только для разработчиков/админов.
 */
export const FLAG_DEFAULTS = {
  mortgageCalculator: true,
  chat: true,
  mapView: true,
  aiDescription: true,
  promotions: true,
  developerShowcases: true,
  biometricLogin: true,
} as const;

export type FlagKey = keyof typeof FLAG_DEFAULTS;
export type FlagValues = Record<FlagKey, boolean>;

export const FLAG_KEYS = Object.keys(FLAG_DEFAULTS) as FlagKey[];

interface FlagsState {
  remote: Partial<FlagValues>;
  overrides: Partial<FlagValues>;
  fetchedAt: string | null;
  setRemote: (values: Partial<FlagValues>) => void;
  setOverride: (key: FlagKey, value: boolean | null) => void;
  clearOverrides: () => void;
}

export const useFlagsStore = create<FlagsState>()(
  persist(
    (set) => ({
      remote: {},
      overrides: {},
      fetchedAt: null,
      setRemote: (remote) => set({ remote, fetchedAt: new Date().toISOString() }),
      setOverride: (key, value) =>
        set((s) => {
          const overrides = { ...s.overrides };
          if (value === null) delete overrides[key];
          else overrides[key] = value;
          return { overrides };
        }),
      clearOverrides: () => set({ overrides: {} }),
    }),
    { name: STORAGE_KEYS.flags, storage: zustandStorage, version: 1 },
  ),
);

export function resolveFlag(state: Pick<FlagsState, 'remote' | 'overrides'>, key: FlagKey): boolean {
  return state.overrides[key] ?? state.remote[key] ?? FLAG_DEFAULTS[key];
}

export function useFeatureFlag(key: FlagKey): boolean {
  return useFlagsStore((s) => resolveFlag(s, key));
}
