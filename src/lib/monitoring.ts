import { env } from './env';

/**
 * Наблюдаемость: единый фасад для отлова крашей (Sentry / Crashlytics).
 * Сейчас подключён консольный адаптер. Чтобы включить Sentry:
 *   1) npx expo install @sentry/react-native  2) добавить плагин в app.config.ts
 *   3) реализовать CrashAdapter поверх Sentry и передать в monitoring.setAdapter().
 * Интерфейс приложения при этом не меняется.
 */

export type Severity = 'info' | 'warning' | 'error' | 'fatal';

export interface Breadcrumb {
  category: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface MonitoringUser {
  id: string;
  role: string;
}

export interface CrashAdapter {
  name: string;
  captureException(error: unknown, context?: Record<string, unknown>): void;
  captureMessage(message: string, level: Severity, context?: Record<string, unknown>): void;
  setUser(user: MonitoringUser | null): void;
  addBreadcrumb(breadcrumb: Breadcrumb): void;
}

const MAX_BREADCRUMBS = 50;

function createConsoleAdapter(): CrashAdapter {
  const breadcrumbs: (Breadcrumb & { at: string })[] = [];
  let currentUser: MonitoringUser | null = null;
  return {
    name: 'console',
    captureException(error, context) {
      if (__DEV__) {
        console.warn('[monitoring] exception', error, { context, user: currentUser, breadcrumbs: breadcrumbs.slice(-5) });
      }
    },
    captureMessage(message, level, context) {
      if (__DEV__) console.warn(`[monitoring] ${level}: ${message}`, context ?? '');
    },
    setUser(user) {
      currentUser = user;
    },
    addBreadcrumb(breadcrumb) {
      breadcrumbs.push({ ...breadcrumb, at: new Date().toISOString() });
      if (breadcrumbs.length > MAX_BREADCRUMBS) breadcrumbs.shift();
    },
  };
}

let adapter: CrashAdapter = createConsoleAdapter();

interface ErrorUtilsShape {
  getGlobalHandler(): (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler(handler: (error: unknown, isFatal?: boolean) => void): void;
}

let globalHandlersInstalled = false;
let hangTimer: ReturnType<typeof setInterval> | null = null;

const HANG_CHECK_INTERVAL_MS = 1000;
const HANG_THRESHOLD_MS = 2500;

export const monitoring = {
  setAdapter(next: CrashAdapter) {
    adapter = next;
  },
  captureException(error: unknown, context?: Record<string, unknown>) {
    try {
      adapter.captureException(error, { appEnv: env.appEnv, version: env.appVersion, ...context });
    } catch {
      // мониторинг никогда не должен ронять приложение
    }
  },
  captureMessage(message: string, level: Severity = 'info', context?: Record<string, unknown>) {
    try {
      adapter.captureMessage(message, level, context);
    } catch {
      // noop
    }
  },
  setUser(user: MonitoringUser | null) {
    adapter.setUser(user);
  },
  addBreadcrumb(breadcrumb: Breadcrumb) {
    adapter.addBreadcrumb(breadcrumb);
  },

  /** Перехват фатальных JS-исключений до штатного обработчика React Native. */
  installGlobalHandlers() {
    if (globalHandlersInstalled) return;
    globalHandlersInstalled = true;
    const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsShape }).ErrorUtils;
    if (!errorUtils) return;
    const previous = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error, isFatal) => {
      monitoring.captureException(error, { fatal: Boolean(isFatal), source: 'global' });
      previous(error, isFatal);
    });
  },

  /** Детектор «зависаний»: если JS-поток не отвечает дольше порога — фиксируем событие. */
  startHangDetector() {
    if (hangTimer) return;
    let last = Date.now();
    hangTimer = setInterval(() => {
      const now = Date.now();
      const lag = now - last - HANG_CHECK_INTERVAL_MS;
      last = now;
      if (lag > HANG_THRESHOLD_MS) {
        monitoring.captureMessage('js_thread_stall', 'warning', { lagMs: lag });
      }
    }, HANG_CHECK_INTERVAL_MS);
  },

  stopHangDetector() {
    if (hangTimer) clearInterval(hangTimer);
    hangTimer = null;
  },
};
