import { usePathname } from 'expo-router';
import { type ReactNode, useEffect } from 'react';

import { useAppStateChange } from '@/hooks/common';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { changeLanguage, detectDeviceLanguage } from '@/i18n';
import { analytics } from '@/lib/analytics';
import { monitoring } from '@/lib/monitoring';
import { api } from '@/services/api';
import { type FlagKey, useFeatureFlag, useFlagsStore } from '@/store/flags';
import { usePreferencesStore } from '@/store/preferences';

/** Подтягивает remote config (feature flags) при старте и при возвращении в приложение. */
function useRemoteFlags(): void {
  useEffect(() => {
    const load = () =>
      api.config
        .flags()
        .then((flags) => useFlagsStore.getState().setRemote(flags))
        .catch((error: unknown) => monitoring.captureException(error, { scope: 'flags' }));
    void load();
  }, []);
  useAppStateChange((next, previous) => {
    if (next === 'active' && previous !== 'active') {
      api.config
        .flags()
        .then((flags) => useFlagsStore.getState().setRemote(flags))
        .catch(() => undefined);
    }
  });
}

/** Автоматический трекинг экранов для воронок (Amplitude / PostHog). */
function useScreenTracking(): void {
  const pathname = usePathname();
  useEffect(() => {
    analytics.track('screen_view', { screen: pathname });
    monitoring.addBreadcrumb({ category: 'navigation', message: pathname });
  }, [pathname]);
}

/** Язык меняется «на лету» без перезапуска. */
function useLanguageSync(): void {
  const language = usePreferencesStore((s) => s.language);
  useEffect(() => {
    changeLanguage(language ?? detectDeviceLanguage());
  }, [language]);
}

export function AppSync() {
  useRemoteFlags();
  useScreenTracking();
  useLanguageSync();
  useRealtimeSync();
  return null;
}

/** Рендерит детей, только если фича включена (feature flag). */
export function FeatureGate({ flag, children, fallback = null }: { flag: FlagKey; children: ReactNode; fallback?: ReactNode }) {
  const enabled = useFeatureFlag(flag);
  return <>{enabled ? children : fallback}</>;
}
