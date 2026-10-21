import type { DealType, PaymentMethod, PromotionTier, Role } from '@/types/domain';

import { env } from './env';
import { monitoring } from './monitoring';

/**
 * Продуктовая аналитика. Строго типизированная карта событий — опечатка в имени
 * или свойстве ловится компилятором. Провайдеры (Amplitude, PostHog) подключаются
 * через analytics.addProvider(), код экранов при этом не меняется.
 */
export interface AnalyticsEvents {
  app_open: { cold: boolean };
  screen_view: { screen: string };
  search_submitted: { query: string };
  filters_applied: { activeCount: number; dealType: DealType };
  catalog_view_mode: { mode: 'list' | 'map' };
  property_viewed: { propertyId: string; source: string };
  gallery_swiped: { propertyId: string; index: number };
  gallery_milestone: { propertyId: string; photosSeen: number };
  favorite_toggled: { propertyId: string; liked: boolean };
  call_tapped: { propertyId: string };
  share_tapped: { propertyId: string };
  viewing_booked: { propertyId: string };
  viewing_cancelled: { viewingId: string };
  chat_opened: { conversationId: string };
  chat_message_sent: { conversationId: string; withAttachments: boolean; quickReply: boolean };
  sign_up_started: { source: string };
  sign_up_completed: { role: Role };
  sign_in_completed: { method: 'password' | 'biometric' };
  signed_out: Record<string, never>;
  listing_wizard_step: { step: number };
  listing_submitted: { dealType: DealType; photos: number };
  ai_description_generated: { length: number };
  promotion_selected: { tier: PromotionTier };
  promotion_purchased: { tier: PromotionTier; method: PaymentMethod; amount: number };
  map_marker_tapped: { propertyId: string };
  mortgage_used: { propertyId: string; termMonths: number; mode: 'mortgage' | 'installment' };
  complex_unit_tapped: { complexId: string; unitId: string };
  language_changed: { language: string };
  theme_changed: { theme: string };
  moderation_decision: { listingId: string; decision: 'approve' | 'reject' };
  user_ban_toggled: { userId: string; banned: boolean };
  feedback_sent: { topic: string };
}

export type AnalyticsEventName = keyof AnalyticsEvents;

export interface AnalyticsProvider {
  name: string;
  track(event: string, properties: Record<string, unknown>): void;
  identify(userId: string | null, traits?: Record<string, unknown>): void;
}

const consoleProvider: AnalyticsProvider = {
  name: 'console',
  track(event, properties) {
    if (__DEV__) console.log(`[analytics] ${event}`, properties);
  },
  identify(userId, traits) {
    if (__DEV__) console.log('[analytics] identify', userId, traits ?? {});
  },
};

/** Буфер для удалённого провайдера: батчинг, чтобы не дёргать сеть на каждое событие. */
interface QueuedEvent {
  event: string;
  properties: Record<string, unknown>;
  timestamp: string;
}

const MAX_QUEUE = 200;
const queue: QueuedEvent[] = [];
const providers: AnalyticsProvider[] = [consoleProvider];
let commonProperties: Record<string, unknown> = {
  app_env: env.appEnv,
  app_version: env.appVersion,
};

export const analytics = {
  addProvider(provider: AnalyticsProvider) {
    if (!providers.some((p) => p.name === provider.name)) providers.push(provider);
  },

  setCommonProperties(properties: Record<string, unknown>) {
    commonProperties = { ...commonProperties, ...properties };
  },

  track<E extends AnalyticsEventName>(event: E, properties: AnalyticsEvents[E]) {
    const payload = { ...commonProperties, ...properties };
    queue.push({ event, properties: payload, timestamp: new Date().toISOString() });
    if (queue.length > MAX_QUEUE) queue.shift();
    monitoring.addBreadcrumb({ category: 'analytics', message: event });
    for (const provider of providers) {
      try {
        provider.track(event, payload);
      } catch (error) {
        monitoring.captureException(error, { scope: 'analytics', provider: provider.name });
      }
    }
  },

  identify(userId: string | null, traits?: Record<string, unknown>) {
    for (const provider of providers) {
      try {
        provider.identify(userId, traits);
      } catch (error) {
        monitoring.captureException(error, { scope: 'analytics.identify', provider: provider.name });
      }
    }
  },

  /** Забрать накопленные события (для отправки батчем в Amplitude/PostHog). */
  drain(): QueuedEvent[] {
    return queue.splice(0, queue.length);
  },
};
