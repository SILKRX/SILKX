import { ru } from '@/i18n/locales/ru';
import { ApiError } from '@/lib/errors';
import { uid } from '@/lib/id';
import type { ListingDraft } from '@/store/listingDraft';
import type {
  ActivityLogEntry,
  AdminUser,
  PaymentMethod,
  PaymentReceipt,
  PromotionTariff,
  PromotionTier,
  Property,
  RejectionReason,
  SellerStats,
} from '@/types/domain';

import { hydrateProperty, toPublicUser } from '../mock/db';
import { localDateKey, logActivity, pushNotification } from '../mock/helpers';
import { SUPPORT_USER_ID } from '../mock/seed';
import type { PropertyRecord } from '../mock/types';
import { authedRequest, requireRole } from './client';

export const PROMOTION_TARIFFS: readonly PromotionTariff[] = [
  { id: 'top', price: 49_000, currency: 'UZS', days: 7 },
  { id: 'gold', price: 89_000, currency: 'UZS', days: 14 },
  { id: 'vip', price: 199_000, currency: 'UZS', days: 30 },
];

function draftTitle(draft: ListingDraft): string {
  const area = draft.area ?? 0;
  if (draft.type === 'apartment') {
    return draft.rooms === 0 ? `Студия, ${area} м²` : `${draft.rooms ?? 1}-комн. квартира, ${area} м²`;
  }
  const names = { house: 'Дом', townhouse: 'Таунхаус', commercial: 'Коммерческое помещение' } as const;
  return `${names[draft.type]}, ${area} м²`;
}

export const sellerApi = {
  listings: () =>
    authedRequest<Property[]>((db, ctx) => {
      requireRole(ctx, 'seller', 'admin');
      return db.properties
        .filter((p) => p.sellerId === ctx.userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((p) => hydrateProperty(db, p));
    }),

  stats: () =>
    authedRequest<SellerStats>((db, ctx) => {
      requireRole(ctx, 'seller', 'admin');
      const own = db.properties.filter((p) => p.sellerId === ctx.userId);
      const views = own.reduce((s, p) => s + p.views, 0);
      const favorites = own.reduce((s, p) => s + p.favoritesCount, 0);
      const calls = own.reduce((s, p) => s + p.calls, 0);
      const messages = db.conversations.filter((c) => c.participantIds.includes(ctx.userId) && !c.isSupport).length;
      const daily = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const key = localDateKey(date);
        const seed = key.split('-').reduce((s, part) => s + Number(part), 0) + own.length;
        const dayViews = Math.round((views / 30) * (0.6 + ((seed * 37) % 80) / 100));
        return { date: key, views: dayViews, calls: Math.max(0, Math.round(dayViews * 0.04)) };
      });
      return {
        views,
        favorites,
        calls,
        messages,
        conversion: views > 0 ? Math.round((calls / views) * 1000) / 10 : 0,
        activeListings: own.filter((p) => p.status === 'active').length,
        pendingListings: own.filter((p) => p.status === 'pending').length,
        daily,
      };
    }),

  create: (draft: ListingDraft) =>
    authedRequest<Property>(
      (db, ctx) => {
        requireRole(ctx, 'seller', 'admin');
        if (!draft.price || !draft.area || draft.rooms === null || !draft.coords || !draft.district) throw new ApiError('VALIDATION');
        const now = new Date().toISOString();
        const record: PropertyRecord = {
          id: uid('p'),
          dealType: draft.dealType,
          type: draft.type,
          title: draftTitle(draft),
          description: draft.description.trim(),
          price: draft.price,
          currency: 'USD',
          area: draft.area,
          rooms: draft.rooms,
          floor: draft.floor ?? 1,
          floorsTotal: draft.floorsTotal ?? 1,
          district: draft.district,
          address: draft.address.trim(),
          coords: draft.coords,
          images: draft.photos,
          amenities: draft.amenities,
          renovation: draft.renovation,
          furnished: draft.furnished,
          installment: draft.installment,
          mortgage: draft.dealType === 'sale',
          complexId: null,
          sellerId: ctx.userId,
          status: 'pending',
          promotion: null,
          isHot: false,
          isPremium: false,
          createdAt: now,
          updatedAt: now,
          views: 0,
          favoritesCount: 0,
          calls: 0,
          previousPrice: null,
          completionYear: null,
          rejectionReason: null,
        };
        db.properties.unshift(record);
        logActivity(db, ctx.userId, 'Создал объявление', record.id);
        for (const admin of db.users.filter((u) => u.role === 'admin' && u.id !== SUPPORT_USER_ID)) {
          pushNotification(db, admin.id, 'system', 'Новое объявление на модерации', `${ctx.user.company ?? ctx.user.name}: ${record.title}`, {
            propertyId: record.id,
          });
        }
        return hydrateProperty(db, record);
      },
      { mutates: true, latency: [900, 1500] },
    ),

  promote: (input: { listingId: string; tier: PromotionTier; method: PaymentMethod }) =>
    authedRequest<PaymentReceipt>(
      (db, ctx) => {
        requireRole(ctx, 'seller', 'admin');
        const record = db.properties.find((p) => p.id === input.listingId && p.sellerId === ctx.userId);
        if (!record) throw new ApiError('NOT_FOUND');
        const tariff = PROMOTION_TARIFFS.find((t) => t.id === input.tier);
        if (!tariff) throw new ApiError('VALIDATION');
        record.promotion = input.tier;
        record.updatedAt = new Date().toISOString();
        const receipt: PaymentReceipt = {
          id: String(100000 + db.receipts.length + Math.floor(Math.random() * 900)),
          listingId: record.id,
          tariff: input.tier,
          amount: tariff.price,
          currency: 'UZS',
          method: input.method,
          paidAt: new Date().toISOString(),
        };
        db.receipts.push(receipt);
        pushNotification(
          db,
          ctx.userId,
          'payment_success',
          'Оплата прошла успешно',
          `${ru.promote.tiers[input.tier].title} для «${record.title}». Чек №${receipt.id}`,
          { propertyId: record.id },
        );
        logActivity(db, ctx.userId, 'Оплатил продвижение', `${input.tier} · ${tariff.price} UZS`);
        return receipt;
      },
      { mutates: true, latency: [1600, 2400] },
    ),
};

export interface AdminOverview {
  pending: number;
  users: number;
  banned: number;
  activeListings: number;
}

export const adminApi = {
  overview: () =>
    authedRequest<AdminOverview>((db, ctx) => {
      requireRole(ctx, 'admin');
      return {
        pending: db.properties.filter((p) => p.status === 'pending').length,
        users: db.users.filter((u) => u.id !== SUPPORT_USER_ID).length,
        banned: db.users.filter((u) => u.banned).length,
        activeListings: db.properties.filter((p) => p.status === 'active').length,
      };
    }),

  queue: () =>
    authedRequest<Property[]>((db, ctx) => {
      requireRole(ctx, 'admin');
      return db.properties
        .filter((p) => p.status === 'pending')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((p) => hydrateProperty(db, p));
    }),

  approve: (propertyId: string) =>
    authedRequest<void>(
      (db, ctx) => {
        requireRole(ctx, 'admin');
        const record = db.properties.find((p) => p.id === propertyId);
        if (!record) throw new ApiError('NOT_FOUND');
        record.status = 'active';
        record.rejectionReason = null;
        record.updatedAt = new Date().toISOString();
        pushNotification(db, record.sellerId, 'moderation_approved', 'Объявление прошло модерацию', `«${record.title}» опубликовано в каталоге`, {
          propertyId: record.id,
        });
        logActivity(db, ctx.userId, 'Одобрил объявление', record.id);
      },
      { mutates: true },
    ),

  reject: (propertyId: string, reason: RejectionReason) =>
    authedRequest<void>(
      (db, ctx) => {
        requireRole(ctx, 'admin');
        const record = db.properties.find((p) => p.id === propertyId);
        if (!record) throw new ApiError('NOT_FOUND');
        record.status = 'rejected';
        record.rejectionReason = reason;
        record.updatedAt = new Date().toISOString();
        pushNotification(
          db,
          record.sellerId,
          'moderation_rejected',
          'Объявление отклонено',
          `«${record.title}». Причина: ${ru.admin.reasons[reason].toLowerCase()}. Исправьте и отправьте снова.`,
          { propertyId: record.id },
        );
        logActivity(db, ctx.userId, 'Отклонил объявление', `${record.id} · ${reason}`);
      },
      { mutates: true },
    ),

  users: (query: string) =>
    authedRequest<AdminUser[]>((db, ctx) => {
      requireRole(ctx, 'admin');
      const q = query.trim().toLowerCase();
      const digits = q.replace(/\D/g, '');
      return db.users
        .filter((u) => u.id !== SUPPORT_USER_ID)
        .filter(
          (u) =>
            !q ||
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            (digits.length >= 3 && u.phone.replace(/\D/g, '').includes(digits)),
        )
        .map((u) => ({
          ...toPublicUser(u),
          banned: u.banned,
          listingsCount: db.properties.filter((p) => p.sellerId === u.id).length,
          lastActiveAt: u.lastActiveAt,
        }))
        .sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt));
    }),

  setBanned: (userId: string, banned: boolean) =>
    authedRequest<void>(
      (db, ctx) => {
        requireRole(ctx, 'admin');
        const user = db.users.find((u) => u.id === userId);
        if (!user) throw new ApiError('NOT_FOUND');
        if (user.role === 'admin') throw new ApiError('FORBIDDEN');
        user.banned = banned;
        if (banned) db.sessions = db.sessions.filter((s) => s.userId !== userId);
        logActivity(db, userId, banned ? 'Аккаунт заблокирован' : 'Аккаунт разблокирован', `админ: ${ctx.user.name}`);
      },
      { mutates: true },
    ),

  logs: (userId: string) =>
    authedRequest<ActivityLogEntry[]>((db, ctx) => {
      requireRole(ctx, 'admin');
      return db.logs.filter((l) => l.userId === userId).slice(0, 50);
    }),
};
