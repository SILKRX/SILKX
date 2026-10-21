import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { analytics } from '@/lib/analytics';
import { isApiError } from '@/lib/errors';
import { monitoring } from '@/lib/monitoring';
import { STORAGE_KEYS, tokenStorage, zustandStorage } from '@/lib/storage';
import { queryClient } from '@/query/client';
import { api, authClient, type SignInInput, type SignUpInput } from '@/services/api';
import type { Role, User } from '@/types/domain';

import { useFavoritesStore } from './favorites';
import { usePreferencesStore } from './preferences';

export type SessionStatus = 'loading' | 'authenticated' | 'guest';

interface SessionState {
  status: SessionStatus;
  user: User | null;
  /** Биометрический замок поверх приложения (если включён в настройках) */
  locked: boolean;
  bootstrap: () => Promise<void>;
  signIn: (input: SignInInput) => Promise<User>;
  signUp: (input: SignUpInput) => Promise<User>;
  signOut: () => Promise<void>;
  setUser: (user: User) => void;
  setLocked: (locked: boolean) => void;
}

function identify(user: User | null): void {
  monitoring.setUser(user ? { id: user.id, role: user.role } : null);
  analytics.identify(user?.id ?? null, user ? { role: user.role } : undefined);
}

async function mergeGuestFavorites(): Promise<void> {
  try {
    const merged = await api.favorites.merge(useFavoritesStore.getState().ids);
    useFavoritesStore.getState().replaceAll(merged);
  } catch (error) {
    monitoring.captureException(error, { scope: 'session.mergeFavorites' });
  }
}

/**
 * Сессия: профиль пользователя (несекретный) кэшируется в AsyncStorage для мгновенного
 * старта офлайн; access/refresh токены — только в SecureStore через tokenStorage.
 */
export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => {
      const resetToGuest = async () => {
        authClient.setTokens(null);
        await tokenStorage.clear();
        useFavoritesStore.getState().clear();
        queryClient.clear();
        set({ status: 'guest', user: null, locked: false });
        identify(null);
      };

      authClient.onSessionExpired(() => {
        void resetToGuest();
      });

      return {
        status: 'loading',
        user: null,
        locked: false,

        bootstrap: async () => {
          const tokens = await tokenStorage.load();
          if (!tokens) {
            set({ status: 'guest', user: null, locked: false });
            return;
          }
          authClient.setTokens(tokens);
          const locked = usePreferencesStore.getState().biometricEnabled;
          set({ status: 'authenticated', locked });
          identify(get().user);
          try {
            const me = await api.auth.me();
            set({ user: me });
            identify(me);
          } catch (error) {
            if (isApiError(error) && (error.code === 'UNAUTHORIZED' || error.code === 'BANNED')) {
              await resetToGuest();
            }
            // офлайн: остаёмся в сессии с кэшированным профилем
          }
        },

        signIn: async (input) => {
          const session = await api.auth.signIn(input);
          await tokenStorage.save(session.tokens);
          authClient.setTokens(session.tokens);
          set({ status: 'authenticated', user: session.user, locked: false });
          identify(session.user);
          analytics.track('sign_in_completed', { method: 'password' });
          await mergeGuestFavorites();
          void queryClient.invalidateQueries();
          return session.user;
        },

        signUp: async (input) => {
          const session = await api.auth.signUp(input);
          await tokenStorage.save(session.tokens);
          authClient.setTokens(session.tokens);
          set({ status: 'authenticated', user: session.user, locked: false });
          identify(session.user);
          analytics.track('sign_up_completed', { role: session.user.role });
          await mergeGuestFavorites();
          return session.user;
        },

        signOut: async () => {
          const refreshToken = authClient.getTokens()?.refreshToken;
          if (refreshToken) {
            try {
              await api.auth.signOut(refreshToken);
            } catch (error) {
              monitoring.captureException(error, { scope: 'session.signOut' });
            }
          }
          analytics.track('signed_out', {});
          await resetToGuest();
        },

        setUser: (user) => set({ user }),
        setLocked: (locked) => set({ locked }),
      };
    },
    {
      name: STORAGE_KEYS.session,
      storage: zustandStorage,
      version: 1,
      partialize: (s) => ({ user: s.user }),
    },
  ),
);

export function useRole(): Role | null {
  return useSessionStore((s) => (s.status === 'authenticated' ? (s.user?.role ?? 'buyer') : null));
}

export function useIsSignedIn(): boolean {
  return useSessionStore((s) => s.status === 'authenticated');
}

export function useUserId(): string {
  return useSessionStore((s) => s.user?.id ?? 'guest');
}
