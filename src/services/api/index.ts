import { authApi } from './auth';
import { adminApi, sellerApi } from './business';
import { complexesApi, favoritesApi, geoApi, propertiesApi } from './catalog';
import { chatApi, notificationsApi, viewingsApi } from './engagement';
import { aiApi, configApi, supportApi } from './misc';

/** Единая точка входа в API приложения. */
export const api = {
  auth: authApi,
  properties: propertiesApi,
  complexes: complexesApi,
  favorites: favoritesApi,
  geo: geoApi,
  viewings: viewingsApi,
  chat: chatApi,
  notifications: notificationsApi,
  seller: sellerApi,
  admin: adminApi,
  support: supportApi,
  ai: aiApi,
  config: configApi,
};

export { authClient } from './authClient';
export type { ProfilePatch, SignInInput, SignUpInput } from './auth';
export { PROMOTION_TARIFFS } from './business';
export type { AdminOverview } from './business';
export { CATALOG_PAGE_SIZE } from './catalog';
export type { AddressSuggestion } from './catalog';
export type { DaySlots, ScheduleDay, ViewingWithProperty } from './engagement';
/** Демо-аккаунты встроенного mock-сервера (до подключения реального бэкенда). */
export { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../mock/seed';
export { mockDb } from '../mock/db';
