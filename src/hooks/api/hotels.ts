import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { qk } from '@/query/keys';
import { api } from '@/services/api';
import type { DistrictId, Hotel, HotelBookingInput } from '@/types/domain';

export function useHotels(district: DistrictId | null = null) {
  return useQuery({
    queryKey: qk.hotels.list(district),
    queryFn: () => api.hotels.list({ district }),
    staleTime: 10 * 60_000,
  });
}

export function useHotel(id: string) {
  const client = useQueryClient();
  return useQuery({
    queryKey: qk.hotels.detail(id),
    queryFn: () => api.hotels.get(id),
    enabled: id.length > 0,
    // карточка из списка открывается мгновенно
    placeholderData: () => client.getQueryData<Hotel[]>(qk.hotels.list(null))?.find((h) => h.id === id),
  });
}

export function useBookHotel() {
  return useMutation({ mutationFn: (input: HotelBookingInput) => api.hotels.book(input) });
}
