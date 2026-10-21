import { ApiError } from '@/lib/errors';
import { isOnlineNow } from '@/store/network';
import { usePreferencesStore } from '@/store/preferences';
import type { Role } from '@/types/domain';

import { verifyAccessToken } from '../mock/crypto';
import { mockDb } from '../mock/db';
import type { MockDatabase, UserRecord } from '../mock/types';
import { authClient } from './authClient';

/**
 * Транспорт API. Сейчас запросы обслуживает встроенный mock-сервер с реалистичной
 * задержкой, проверкой сети и токенов. Для реального бэкенда достаточно заменить
 * тело request()/authedRequest() на fetch(env.apiUrl + path) — сигнатуры эндпоинтов не меняются.
 */

export interface RequestOptions {
  latency?: readonly [number, number];
  /** Эндпоинт изменяет данные — сохранить mock-БД */
  mutates?: boolean;
  /** Не участвует в имитации ошибок (например, auth refresh) */
  stable?: boolean;
}

export interface RequestContext {
  user: UserRecord;
  userId: string;
  role: Role;
}

const DEFAULT_LATENCY = [260, 720] as const;
const SIMULATED_FAILURE_RATE = 0.3;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomBetween([min, max]: readonly [number, number]): number {
  return Math.round(min + Math.random() * (max - min));
}

export async function request<T>(handler: (db: MockDatabase) => T | Promise<T>, options: RequestOptions = {}): Promise<T> {
  const db = await mockDb.ready();
  if (!isOnlineNow()) {
    await sleep(randomBetween([120, 260]));
    throw new ApiError('NETWORK');
  }
  await sleep(randomBetween(options.latency ?? DEFAULT_LATENCY));
  if (!isOnlineNow()) throw new ApiError('NETWORK');
  if (!options.stable && usePreferencesStore.getState().simulateErrors && Math.random() < SIMULATED_FAILURE_RATE) {
    throw new ApiError('SERVER');
  }
  const result = await handler(db);
  if (options.mutates) mockDb.markDirty();
  return result;
}

export async function authedRequest<T>(
  handler: (db: MockDatabase, ctx: RequestContext) => T | Promise<T>,
  options: RequestOptions = {},
): Promise<T> {
  const token = await authClient.getValidAccessToken();
  if (!token) throw new ApiError('UNAUTHORIZED');
  return request((db) => {
    const payload = verifyAccessToken(token);
    if (!payload || payload.exp < Date.now()) throw new ApiError('UNAUTHORIZED');
    const user = db.users.find((u) => u.id === payload.sub);
    if (!user) throw new ApiError('UNAUTHORIZED');
    if (user.banned) throw new ApiError('BANNED');
    user.lastActiveAt = new Date().toISOString();
    return handler(db, { user, userId: user.id, role: user.role });
  }, options);
}

export function requireRole(ctx: RequestContext, ...roles: Role[]): void {
  if (!roles.includes(ctx.role)) throw new ApiError('FORBIDDEN');
}
