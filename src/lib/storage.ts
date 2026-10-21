import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createJSONStorage } from 'zustand/middleware';

import type { AuthTokens } from '@/types/domain';

import { monitoring } from './monitoring';

/**
 * Два уровня хранения:
 *  • AsyncStorage — несекретные данные (настройки, кэш каталога, избранное) через Zustand persist;
 *  • SecureStore (Keychain / Keystore) — ТОЛЬКО токены и сессии. В AsyncStorage секреты не пишем никогда.
 *
 * На web SecureStore недоступен — держим секреты только в памяти (не в localStorage).
 */

export const zustandStorage = createJSONStorage(() => AsyncStorage);

export const STORAGE_KEYS = {
  preferences: 'silkx.preferences.v1',
  session: 'silkx.session.v1',
  favorites: 'silkx.favorites.v1',
  history: 'silkx.history.v1',
  filters: 'silkx.filters.v1',
  flags: 'silkx.flags.v1',
  listingDraft: 'silkx.listing-draft.v1',
  queryCache: 'silkx.query-cache.v1',
  mockDb: 'silkx.mock-db.v3',
  reminders: 'silkx.reminders.v1',
} as const;

const SECURE_KEYS = {
  tokens: 'silkx.auth.tokens',
} as const;

const memorySecrets = new Map<string, string>();
const isWeb = Platform.OS === 'web';

const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    if (isWeb) return memorySecrets.get(key) ?? null;
    try {
      return await SecureStore.getItemAsync(key, SECURE_OPTIONS);
    } catch (error) {
      monitoring.captureException(error, { scope: 'secureStorage.get', key });
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    if (isWeb) {
      memorySecrets.set(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value, SECURE_OPTIONS);
  },
  async remove(key: string): Promise<void> {
    if (isWeb) {
      memorySecrets.delete(key);
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key, SECURE_OPTIONS);
    } catch (error) {
      monitoring.captureException(error, { scope: 'secureStorage.remove', key });
    }
  },
};

function isTokens(value: unknown): value is AuthTokens {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.accessToken === 'string' && typeof v.refreshToken === 'string' && typeof v.expiresAt === 'number';
}

export const tokenStorage = {
  async load(): Promise<AuthTokens | null> {
    const raw = await secureStorage.get(SECURE_KEYS.tokens);
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return isTokens(parsed) ? parsed : null;
    } catch {
      await secureStorage.remove(SECURE_KEYS.tokens);
      return null;
    }
  },
  async save(tokens: AuthTokens): Promise<void> {
    await secureStorage.set(SECURE_KEYS.tokens, JSON.stringify(tokens));
  },
  async clear(): Promise<void> {
    await secureStorage.remove(SECURE_KEYS.tokens);
  },
};
