import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { env } from '@/lib/env';
import { PERSIST_MAX_AGE, queryClient, queryPersister } from '@/query/client';
import { useUiStore } from '@/store/ui';
import { ThemeProvider, useTheme } from '@/theme';

function NavigationTheme({ children }: { children: ReactNode }) {
  const { isDark, colors } = useTheme();
  const statusBarOverride = useUiStore((s) => s.statusBarOverride);
  const base = isDark ? DarkTheme : DefaultTheme;
  return (
    <NavigationThemeProvider
      value={{
        ...base,
        dark: isDark,
        colors: {
          ...base.colors,
          primary: colors.gold,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.gold,
        },
      }}
    >
      <StatusBar style={statusBarOverride ?? (isDark ? 'light' : 'dark')} animated />
      {children}
    </NavigationThemeProvider>
  );
}

/** Все провайдеры приложения в правильном порядке. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <ThemeProvider>
            <NavigationTheme>
              <PersistQueryClientProvider
                client={queryClient}
                persistOptions={{
                  persister: queryPersister,
                  maxAge: PERSIST_MAX_AGE,
                  buster: env.appVersion,
                  dehydrateOptions: {
                    shouldDehydrateQuery: (query) => query.state.status === 'success',
                  },
                }}
              >
                <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
              </PersistQueryClientProvider>
            </NavigationTheme>
          </ThemeProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
