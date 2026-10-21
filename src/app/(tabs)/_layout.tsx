import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';

import { AppTabBar } from '@/components/navigation/AppTabBar';
import { useUnreadCounts } from '@/hooks/api/engagement';
import { useRole } from '@/store/session';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

/**
 * Табы зависят от роли: администратор видит «Управление» вместо «Избранного».
 * Скрытые табы помечаются hidden — навигатор не даст на них попасть.
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  const role = useRole();
  const isAdmin = role === 'admin';
  const unread = useUnreadCounts();

  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} badges={{ profile: unread.notifications + unread.messages }} />}
      screenOptions={{ headerShown: false, animation: 'fade', lazy: true }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="catalog" options={{ title: t('tabs.catalog') }} />
      <Tabs.Screen name="favorites" options={{ title: t('tabs.favorites'), hidden: isAdmin }} />
      <Tabs.Screen name="manage" options={{ title: t('tabs.manage'), hidden: !isAdmin }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />
    </Tabs>
  );
}
