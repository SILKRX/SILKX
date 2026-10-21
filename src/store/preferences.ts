import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Language } from '@/i18n/types';
import { STORAGE_KEYS, zustandStorage } from '@/lib/storage';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface NotificationPreferences {
  priceDrops: boolean;
  newMatches: boolean;
  viewings: boolean;
  messages: boolean;
}

interface PreferencesState {
  theme: ThemePreference;
  /** null — язык устройства */
  language: Language | null;
  notifications: NotificationPreferences;
  biometricEnabled: boolean;
  /** Dev-настройка: имитация ошибок сервера для проверки оптимистичных откатов */
  simulateErrors: boolean;
  hasHydrated: boolean;
  setTheme: (theme: ThemePreference) => void;
  setLanguage: (language: Language) => void;
  setNotification: (key: keyof NotificationPreferences, value: boolean) => void;
  setBiometricEnabled: (value: boolean) => void;
  setSimulateErrors: (value: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'system',
      language: null,
      notifications: { priceDrops: true, newMatches: true, viewings: true, messages: true },
      biometricEnabled: false,
      simulateErrors: false,
      hasHydrated: false,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setNotification: (key, value) => set((s) => ({ notifications: { ...s.notifications, [key]: value } })),
      setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),
      setSimulateErrors: (simulateErrors) => set({ simulateErrors }),
    }),
    {
      name: STORAGE_KEYS.preferences,
      storage: zustandStorage,
      version: 1,
      partialize: (s) => ({
        theme: s.theme,
        language: s.language,
        notifications: s.notifications,
        biometricEnabled: s.biometricEnabled,
        simulateErrors: s.simulateErrors,
      }),
      onRehydrateStorage: () => () => {
        usePreferencesStore.setState({ hasHydrated: true });
      },
    },
  ),
);
