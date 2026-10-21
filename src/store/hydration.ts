import { useFavoritesStore } from './favorites';
import { useFiltersStore } from './filters';
import { useFlagsStore } from './flags';
import { useHistoryStore } from './history';
import { useListingDraftStore } from './listingDraft';
import { usePreferencesStore } from './preferences';
import { useSessionStore } from './session';

interface PersistedStore {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (listener: () => void) => () => void;
  };
}

const PERSISTED_STORES: PersistedStore[] = [
  usePreferencesStore,
  useSessionStore,
  useFavoritesStore,
  useHistoryStore,
  useFiltersStore,
  useFlagsStore,
  useListingDraftStore,
];

/** Ждём, пока все сторы с persist поднимут данные из AsyncStorage (обычно < 50 мс). */
export function waitForStoresHydration(): Promise<void> {
  return Promise.all(
    PERSISTED_STORES.map(
      (store) =>
        new Promise<void>((resolve) => {
          if (store.persist.hasHydrated()) {
            resolve();
            return;
          }
          const unsubscribe = store.persist.onFinishHydration(() => {
            unsubscribe();
            resolve();
          });
        }),
    ),
  ).then(() => undefined);
}
