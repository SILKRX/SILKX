import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { analytics } from '@/lib/analytics';
import { haptics } from '@/lib/haptics';
import { qk } from '@/query/keys';
import { api } from '@/services/api';
import { useFavoritesStore } from '@/store/favorites';
import { useIsSignedIn, useSessionStore, useUserId } from '@/store/session';
import { toast } from '@/store/toast';

interface ToggleVariables {
  propertyId: string;
  liked: boolean;
}

const TOGGLE_KEY = ['favorites', 'toggle'] as const;
const FAVORITES_ROOT = ['favorites'] as const;

/**
 * Оптимистичный лайк: сердечко закрашивается мгновенно (Zustand), запрос идёт в фоне.
 * Если сервер вернул ошибку — тихо откатываем именно этот объект и показываем тост.
 * Гостям избранное хранится локально и синхронизируется после входа.
 */
export function useToggleFavorite() {
  const { t } = useTranslation();
  const client = useQueryClient();
  const mutation = useMutation<boolean, unknown, ToggleVariables>({
    mutationKey: TOGGLE_KEY,
    mutationFn: async ({ propertyId, liked }) => {
      if (useSessionStore.getState().status !== 'authenticated') return liked;
      return api.favorites.set(propertyId, liked);
    },
    onMutate: ({ propertyId, liked }) => {
      useFavoritesStore.getState().setLiked(propertyId, liked);
      if (liked) haptics.success();
      else haptics.light();
      analytics.track('favorite_toggled', { propertyId, liked });
    },
    onError: (_error, { propertyId, liked }) => {
      useFavoritesStore.getState().setLiked(propertyId, !liked);
      haptics.error();
      toast.error(t('favorites.syncError'));
    },
    onSettled: () => {
      if (useSessionStore.getState().status === 'authenticated') void client.invalidateQueries({ queryKey: FAVORITES_ROOT });
    },
  });

  return (propertyId: string) => {
    const liked = !useFavoritesStore.getState().ids.includes(propertyId);
    mutation.mutate({ propertyId, liked });
  };
}

/**
 * Подтягивает избранное аккаунта с сервера (другое устройство, веб) и сливает с локальным.
 * Пока идут оптимистичные лайки, серверный снимок не применяем — он может быть устаревшим.
 */
export function useFavoritesSync() {
  const signedIn = useIsSignedIn();
  const userId = useUserId();
  const pending = useIsMutating({ mutationKey: TOGGLE_KEY });
  const query = useQuery({ queryKey: qk.favorites(userId), queryFn: api.favorites.list, enabled: signedIn });
  const { data, dataUpdatedAt } = query;

  // Применяем только свежие ответы сервера (новый dataUpdatedAt) и только вне оптимистичных лайков
  useEffect(() => {
    if (!data || pending > 0) return;
    useFavoritesStore.getState().replaceAll(data);
    // pending намеренно не в зависимостях: окончание мутации само инвалидирует запрос
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUpdatedAt]);

  return query;
}
