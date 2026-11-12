import { ApiError } from '@/lib/errors';
import { env } from '@/lib/env';
import { uid } from '@/lib/id';
import type { DistrictId, Hotel, HotelBookingInput, HotelBookingRequest } from '@/types/domain';

import { seedHotels } from '../mock/hotels';
import { request } from './client';

/**
 * Отели. Пока это демо: список статичный, а заявка на бронь только «отправляется»
 * (без предоплаты — отель сам перезванивает). Телефон ресепшена демо-отелей —
 * номер поддержки SILKX, чтобы звонок не ушёл случайному человеку.
 */
let cache: Hotel[] | null = null;
const hotels = (): Hotel[] => (cache ??= seedHotels(env.supportPhone));

export interface HotelFilters {
  district: DistrictId | null;
}

export const hotelsApi = {
  list: (filters: HotelFilters = { district: null }) =>
    request<Hotel[]>(() => hotels().filter((h) => !filters.district || h.district === filters.district), { latency: [250, 600] }),

  get: (id: string) =>
    request<Hotel>(() => {
      const hotel = hotels().find((h) => h.id === id);
      if (!hotel) throw new ApiError('NOT_FOUND');
      return hotel;
    }),

  book: (input: HotelBookingInput) =>
    request<HotelBookingRequest>(
      () => {
        if (!hotels().some((h) => h.id === input.hotelId)) throw new ApiError('NOT_FOUND');
        return { ...input, id: uid('hb'), createdAt: new Date().toISOString() };
      },
      { latency: [700, 1200] },
    ),
};
