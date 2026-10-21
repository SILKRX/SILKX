import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { analytics } from '@/lib/analytics';
import { qk } from '@/query/keys';
import { api } from '@/services/api';
import { useIsSignedIn, useRole, useSessionStore, useUserId } from '@/store/session';
import type { AdminUser, Property, RejectionReason } from '@/types/domain';

// ─────────────────────────────── Продавец

export function useSellerListings() {
  const userId = useUserId();
  const role = useRole();
  return useQuery({ queryKey: qk.seller.listings(userId), queryFn: api.seller.listings, enabled: role === 'seller' });
}

export function useSellerStats() {
  const userId = useUserId();
  const role = useRole();
  return useQuery({ queryKey: qk.seller.stats(userId), queryFn: api.seller.stats, enabled: role === 'seller' });
}

export function useCreateListing() {
  const client = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: api.seller.create,
    onSuccess: (property) => {
      analytics.track('listing_submitted', { dealType: property.dealType, photos: property.images.length });
      client.setQueryData<Property[]>(qk.seller.listings(userId), (old) => [property, ...(old ?? [])]);
      void client.invalidateQueries({ queryKey: qk.seller.stats(userId) });
      void client.invalidateQueries({ queryKey: qk.admin.queue });
    },
  });
}

export function usePromoteListing() {
  const client = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: api.seller.promote,
    onSuccess: (receipt) => {
      analytics.track('promotion_purchased', { tier: receipt.tariff, method: receipt.method, amount: receipt.amount });
      void client.invalidateQueries({ queryKey: qk.seller.listings(userId) });
      void client.invalidateQueries({ queryKey: qk.properties.all });
      void client.invalidateQueries({ queryKey: qk.notifications(userId) });
    },
  });
}

// ─────────────────────────────── Админ

function useIsAdmin(): boolean {
  return useRole() === 'admin';
}

export function useAdminOverview() {
  return useQuery({ queryKey: qk.admin.overview, queryFn: api.admin.overview, enabled: useIsAdmin() });
}

export function useModerationQueue() {
  return useQuery({ queryKey: qk.admin.queue, queryFn: api.admin.queue, enabled: useIsAdmin() });
}

/** Решение модератора — карточка исчезает из очереди сразу, при ошибке возвращается. */
export function useModerate() {
  const client = useQueryClient();
  return useMutation<void, unknown, { id: string; decision: 'approve' } | { id: string; decision: 'reject'; reason: RejectionReason }, { previous?: Property[] }>({
    mutationFn: (input) => (input.decision === 'approve' ? api.admin.approve(input.id) : api.admin.reject(input.id, input.reason)),
    onMutate: async (input) => {
      await client.cancelQueries({ queryKey: qk.admin.queue });
      const previous = client.getQueryData<Property[]>(qk.admin.queue);
      client.setQueryData<Property[]>(qk.admin.queue, (old) => old?.filter((p) => p.id !== input.id));
      analytics.track('moderation_decision', { listingId: input.id, decision: input.decision });
      return { previous };
    },
    onError: (_e, _v, context) => {
      if (context?.previous) client.setQueryData(qk.admin.queue, context.previous);
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: qk.admin.overview });
      void client.invalidateQueries({ queryKey: qk.properties.all });
    },
  });
}

export function useAdminUsers(query: string) {
  return useQuery({ queryKey: qk.admin.users(query), queryFn: () => api.admin.users(query), enabled: useIsAdmin() });
}

export function useSetBanned() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, banned }: { userId: string; banned: boolean }) => api.admin.setBanned(userId, banned),
    onMutate: ({ userId, banned }) => {
      client.setQueriesData<AdminUser[]>({ queryKey: ['admin', 'users'] }, (old) => old?.map((u) => (u.id === userId ? { ...u, banned } : u)));
      analytics.track('user_ban_toggled', { userId, banned });
    },
    onError: () => client.invalidateQueries({ queryKey: ['admin', 'users'] }),
    onSettled: () => client.invalidateQueries({ queryKey: qk.admin.overview }),
  });
}

export function useUserLogs(userId: string | null) {
  return useQuery({ queryKey: qk.admin.logs(userId ?? ''), queryFn: () => api.admin.logs(userId ?? ''), enabled: useIsAdmin() && Boolean(userId) });
}

// ─────────────────────────────── Профиль и прочее

export function useUpdateProfile() {
  return useMutation({
    mutationFn: api.auth.updateProfile,
    onSuccess: (user) => useSessionStore.getState().setUser(user),
  });
}

export function useSendFeedback() {
  return useMutation({ mutationFn: api.support.sendFeedback });
}

export function useAddressSearch(query: string) {
  return useQuery({
    queryKey: qk.geo(query),
    queryFn: () => api.geo.search(query),
    enabled: query.trim().length >= 2,
    staleTime: 10 * 60_000,
  });
}

export function useSignedInQueryEnabled(): boolean {
  return useIsSignedIn();
}
