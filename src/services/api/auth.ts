import { ApiError } from '@/lib/errors';
import type { AuthSession, AuthTokens, Role, User } from '@/types/domain';

import { hashPassword, randomToken, signAccessToken } from '../mock/crypto';
import { toPublicUser } from '../mock/db';
import { logActivity, pushNotification } from '../mock/helpers';
import type { MockDatabase, UserRecord } from '../mock/types';
import { authClient } from './authClient';
import { authedRequest, request } from './client';

const ACCESS_TTL_MS = 15 * 60_000;
const REFRESH_TTL_MS = 30 * 86_400_000;
const MAX_SESSIONS_PER_USER = 8;

function issueTokens(db: MockDatabase, user: UserRecord): AuthTokens {
  const now = Date.now();
  const expiresAt = now + ACCESS_TTL_MS;
  const refreshToken = randomToken(48);
  db.sessions = db.sessions.filter((s) => s.expiresAt > now);
  const own = db.sessions.filter((s) => s.userId === user.id);
  if (own.length >= MAX_SESSIONS_PER_USER) {
    const oldest = own[0];
    db.sessions = db.sessions.filter((s) => s !== oldest);
  }
  db.sessions.push({ refreshToken, userId: user.id, expiresAt: now + REFRESH_TTL_MS });
  return { accessToken: signAccessToken({ sub: user.id, role: user.role, exp: expiresAt }), refreshToken, expiresAt };
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput {
  name: string;
  email: string;
  /** E.164: +998XXXXXXXXX */
  phone: string;
  password: string;
  role: Extract<Role, 'buyer' | 'seller'>;
  company: string | null;
}

export interface ProfilePatch {
  name?: string;
  phone?: string;
  company?: string | null;
  avatar?: string | null;
}

export const authApi = {
  signIn: (input: SignInInput) =>
    request<AuthSession>(
      (db) => {
        const email = input.email.trim().toLowerCase();
        const user = db.users.find((u) => u.email.toLowerCase() === email);
        if (!user || user.passwordHash !== hashPassword(input.password)) throw new ApiError('INVALID_CREDENTIALS');
        if (user.banned) throw new ApiError('BANNED');
        logActivity(db, user.id, 'Вход в аккаунт');
        return { user: toPublicUser(user), tokens: issueTokens(db, user) };
      },
      { mutates: true, stable: true, latency: [450, 900] },
    ),

  signUp: (input: SignUpInput) =>
    request<AuthSession>(
      (db) => {
        const email = input.email.trim().toLowerCase();
        if (db.users.some((u) => u.email.toLowerCase() === email)) throw new ApiError('EMAIL_TAKEN');
        if (db.users.some((u) => u.phone === input.phone)) throw new ApiError('PHONE_TAKEN');
        const now = new Date().toISOString();
        const user: UserRecord = {
          id: `u_${randomToken(10)}`,
          name: input.name.trim(),
          email,
          phone: input.phone,
          role: input.role,
          avatar: null,
          createdAt: now,
          company: input.company?.trim() || null,
          passwordHash: hashPassword(input.password),
          banned: false,
          lastActiveAt: now,
          sellerKind: input.role === 'seller' ? (input.company ? 'developer' : 'owner') : null,
          verified: false,
          rating: 0,
          reviewsCount: 0,
        };
        db.users.push(user);
        logActivity(db, user.id, 'Регистрация', input.role);
        pushNotification(
          db,
          user.id,
          'system',
          'Добро пожаловать в SILKX',
          input.role === 'seller'
            ? 'Создайте первое объявление — модерация занимает до 2 часов.'
            : 'Сохраняйте объекты в избранное — сообщим, когда цена снизится.',
        );
        return { user: toPublicUser(user), tokens: issueTokens(db, user) };
      },
      { mutates: true, stable: true, latency: [700, 1200] },
    ),

  refresh: (refreshToken: string) =>
    request<AuthTokens>(
      (db) => {
        const session = db.sessions.find((s) => s.refreshToken === refreshToken);
        if (!session || session.expiresAt < Date.now()) throw new ApiError('UNAUTHORIZED');
        const user = db.users.find((u) => u.id === session.userId);
        if (!user) throw new ApiError('UNAUTHORIZED');
        if (user.banned) throw new ApiError('BANNED');
        // ротация refresh token: старый больше не действителен
        db.sessions = db.sessions.filter((s) => s !== session);
        return issueTokens(db, user);
      },
      { mutates: true, stable: true, latency: [80, 180] },
    ),

  signOut: (refreshToken: string) =>
    request<void>(
      (db) => {
        db.sessions = db.sessions.filter((s) => s.refreshToken !== refreshToken);
      },
      { mutates: true, stable: true, latency: [60, 160] },
    ),

  me: () => authedRequest<User>((_db, ctx) => toPublicUser(ctx.user), { stable: true, latency: [120, 260] }),

  updateProfile: (patch: ProfilePatch) =>
    authedRequest<User>(
      (db, ctx) => {
        if (patch.phone && db.users.some((u) => u.phone === patch.phone && u.id !== ctx.userId)) throw new ApiError('PHONE_TAKEN');
        if (patch.name !== undefined) ctx.user.name = patch.name.trim();
        if (patch.phone !== undefined) ctx.user.phone = patch.phone;
        if (patch.company !== undefined) ctx.user.company = patch.company?.trim() || null;
        if (patch.avatar !== undefined) ctx.user.avatar = patch.avatar;
        logActivity(db, ctx.userId, 'Обновил профиль');
        return toPublicUser(ctx.user);
      },
      { mutates: true },
    ),
};

authClient.setRefresher(authApi.refresh);
