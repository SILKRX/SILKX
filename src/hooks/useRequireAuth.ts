import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useIsSignedIn } from '@/store/session';
import { toast } from '@/store/toast';

/**
 * Обёртка для действий, требующих входа (записаться, написать, оставить отзыв).
 * Гость попадает на экран входа, а после входа — обратно по `redirect`.
 */
export function useRequireAuth(): (action: () => void, redirect?: string) => void {
  const router = useRouter();
  const { t } = useTranslation();
  const signedIn = useIsSignedIn();

  return (action, redirect) => {
    if (signedIn) {
      action();
      return;
    }
    toast.info(t('errors.requireAuth'));
    router.push({ pathname: '/sign-in', params: redirect ? { redirect } : {} });
  };
}

const SAFE_REDIRECT = /^\/[a-z0-9\-_/[\]]*$/i;

/** Защита от open redirect: принимаем только внутренние пути приложения. */
export function isSafeRedirect(value: unknown): value is string {
  return typeof value === 'string' && value.length > 1 && !value.startsWith('//') && SAFE_REDIRECT.test(value);
}
