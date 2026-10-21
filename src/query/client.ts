import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';

import { isRetryable } from '@/lib/errors';
import { STORAGE_KEYS } from '@/lib/storage';

const DAY_MS = 24 * 60 * 60_000;

/**
 * Сетевой слой: React Query с офлайн-кэшем. Последние успешные ответы
 * сохраняются в AsyncStorage — при старте без сети пользователь сразу видит
 * последний загруженный каталог, а не пустой экран.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: DAY_MS,
      retry: (failureCount, error) => isRetryable(error) && failureCount < 2,
      retryDelay: (attempt) => Math.min(800 * 2 ** attempt, 6000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: STORAGE_KEYS.queryCache,
  throttleTime: 1500,
});

export const PERSIST_MAX_AGE = DAY_MS;
