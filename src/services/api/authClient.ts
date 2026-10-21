import { isApiError } from '@/lib/errors';
import { tokenStorage } from '@/lib/storage';
import type { AuthTokens } from '@/types/domain';

type Refresher = (refreshToken: string) => Promise<AuthTokens>;

const REFRESH_LEEWAY_MS = 30_000;

let tokens: AuthTokens | null = null;
let refresher: Refresher | null = null;
let inFlight: Promise<AuthTokens | null> | null = null;
const expiredListeners = new Set<() => void>();

/**
 * Клиентская часть авторизации: держит токены в памяти (источник — SecureStore),
 * прозрачно обновляет access token по refresh token и сообщает об истечении сессии.
 */
export const authClient = {
  setRefresher(fn: Refresher) {
    refresher = fn;
  },

  setTokens(next: AuthTokens | null) {
    tokens = next;
  },

  getTokens(): AuthTokens | null {
    return tokens;
  },

  onSessionExpired(listener: () => void): () => void {
    expiredListeners.add(listener);
    return () => {
      expiredListeners.delete(listener);
    };
  },

  async getValidAccessToken(): Promise<string | null> {
    if (!tokens) return null;
    if (tokens.expiresAt - Date.now() > REFRESH_LEEWAY_MS) return tokens.accessToken;
    const refreshed = await authClient.refresh();
    return refreshed?.accessToken ?? null;
  },

  /** Один refresh на все параллельные запросы. */
  refresh(): Promise<AuthTokens | null> {
    const current = tokens;
    if (!current || !refresher) return Promise.resolve(null);
    const run = refresher;
    inFlight ??= (async () => {
      try {
        const next = await run(current.refreshToken);
        tokens = next;
        await tokenStorage.save(next);
        return next;
      } catch (error) {
        if (isApiError(error) && (error.code === 'UNAUTHORIZED' || error.code === 'BANNED')) {
          tokens = null;
          await tokenStorage.clear();
          expiredListeners.forEach((listener) => listener());
        }
        // сетевые ошибки: токены сохраняем — сессия восстановится, когда появится сеть
        return null;
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  },
};
