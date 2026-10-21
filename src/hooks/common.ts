import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Авто-рефреш при возвращении на экран (React Query сам обновляет при возврате
 * приложения из фона, а этот хук — при возврате на экран внутри навигации).
 */
export function useRefreshOnFocus(refetch: () => unknown, enabled = true): void {
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      if (enabled) void refetch();
    }, [enabled, refetch]),
  );
}

export function useAppStateChange(handler: (state: AppStateStatus, previous: AppStateStatus) => void): void {
  const previous = useRef<AppStateStatus>((AppState.currentState as AppStateStatus | null | undefined) ?? 'active');
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      handlerRef.current(next, previous.current);
      previous.current = next;
    });
    return () => sub.remove();
  }, []);
}

/** Pull-to-refresh: отдельный флаг, чтобы спиннер не мигал при фоновых обновлениях. */
export function usePullToRefresh(refetch: () => Promise<unknown>): { refreshing: boolean; onRefresh: () => void } {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  }, [refetch]);
  return { refreshing, onRefresh };
}
