import {
  CormorantGaramond_600SemiBold,
} from '@expo-google-fonts/cormorant-garamond/600SemiBold';
import { CormorantGaramond_700Bold } from '@expo-google-fonts/cormorant-garamond/700Bold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { AppProviders } from '@/components/system/AppProviders';
import { AppSync } from '@/components/system/AppSync';
import { BiometricGate } from '@/components/system/BiometricGate';
import { ErrorBoundary } from '@/components/system/ErrorBoundary';
import { NetworkProvider } from '@/components/system/NetworkProvider';
import { SplashOverlay } from '@/components/system/SplashOverlay';
import { iconFont, ToastHost } from '@/components/ui';
import { detectDeviceLanguage, initI18n } from '@/i18n';
import { analytics } from '@/lib/analytics';
import { monitoring } from '@/lib/monitoring';
import { configureNotificationHandler } from '@/lib/push';
import { checkForUpdateOnLaunch } from '@/lib/updates';
import { waitForStoresHydration } from '@/store/hydration';
import { usePreferencesStore } from '@/store/preferences';
import { useRole, useSessionStore } from '@/store/session';
import { useTheme } from '@/theme';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

/** При диплинке на вложенный экран под ним окажутся табы — кнопка «назад» работает. */
export const unstable_settings = { anchor: '(tabs)' };

void SplashScreen.preventAutoHideAsync();
monitoring.installGlobalHandlers();

function RootNavigator() {
  const { colors } = useTheme();
  const signedIn = useSessionStore((s) => s.status === 'authenticated');
  const role = useRole();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen name="property/[id]" />
      <Stack.Screen name="gallery/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="complex/[id]" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="support" />
      <Stack.Screen name="history" />
      <Stack.Screen name="(auth)" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Protected guard={signedIn} redirectTo="/sign-in">
        <Stack.Screen name="book/[id]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="chats/index" />
        <Stack.Screen name="chats/[id]" />
        <Stack.Screen name="viewings" />
        <Stack.Screen name="edit-profile" />
      </Stack.Protected>
      <Stack.Protected guard={role === 'seller'} redirectTo="/profile">
        <Stack.Screen name="listing/create" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="listing/[id]/promote" />
        <Stack.Screen name="checkout" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="seller/slots" />
      </Stack.Protected>
      <Stack.Protected guard={role === 'admin'} redirectTo="/profile">
        <Stack.Screen name="admin/users" />
      </Stack.Protected>
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    ...iconFont,
  });
  const [hydrated, setHydrated] = useState(false);
  const status = useSessionStore((s) => s.status);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await waitForStoresHydration();
      initI18n(usePreferencesStore.getState().language ?? detectDeviceLanguage());
      configureNotificationHandler();
      monitoring.startHangDetector();
      if (cancelled) return;
      setHydrated(true);
      void useSessionStore.getState().bootstrap();
      analytics.track('app_open', { cold: true });
      void checkForUpdateOnLaunch();
    })();
    return () => {
      cancelled = true;
      monitoring.stopHangDetector();
    };
  }, []);

  const fontsReady = fontsLoaded || Boolean(fontError);
  const ready = hydrated && fontsReady && status !== 'loading';

  useEffect(() => {
    if (fontError) monitoring.captureException(fontError, { scope: 'fonts' });
  }, [fontError]);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <ErrorBoundary scope="root">
      <AppProviders>
        <RootNavigator />
        <AppSync />
        <NetworkProvider />
        <ToastHost />
        <BiometricGate />
        <SplashOverlay />
      </AppProviders>
    </ErrorBoundary>
  );
}
