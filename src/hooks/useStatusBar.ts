import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { type StatusBarTone, useUiStore } from '@/store/ui';

/**
 * Пока экран в фокусе, статус-бар принудительно светлый/тёмный (например, поверх фото).
 * При уходе с экрана возвращается цвет темы. null — не переопределять.
 */
export function useFocusedStatusBar(tone: StatusBarTone | null): void {
  const setOverride = useUiStore((s) => s.setStatusBarOverride);
  useFocusEffect(
    useCallback(() => {
      setOverride(tone);
      return () => setOverride(null);
    }, [setOverride, tone]),
  );
}
