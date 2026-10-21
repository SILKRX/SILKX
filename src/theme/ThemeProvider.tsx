import * as SystemUI from 'expo-system-ui';
import { createContext, type ReactNode, use, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { usePreferencesStore } from '@/store/preferences';

import { type ColorScheme, colorsByScheme, type ThemeColors } from './colors';

export interface Theme {
  scheme: ColorScheme;
  isDark: boolean;
  colors: ThemeColors;
}

export const themes: Record<ColorScheme, Theme> = {
  light: { scheme: 'light', isDark: false, colors: colorsByScheme.light },
  dark: { scheme: 'dark', isDark: true, colors: colorsByScheme.dark },
};

const ThemeContext = createContext<Theme>(themes.dark);

/**
 * Тема: «системная» по умолчанию, пользователь может зафиксировать светлую/тёмную в настройках.
 * Фирменный стиль SILKX — тёмный, поэтому при отсутствии системного значения берём dark.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = usePreferencesStore((s) => s.theme);
  const system = useColorScheme();

  const scheme: ColorScheme = preference === 'system' ? (system === 'light' ? 'light' : 'dark') : preference;
  const theme = themes[scheme];

  useEffect(() => {
    // Фон корневого view: без белых вспышек при переходах и открытии клавиатуры
    SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => undefined);
  }, [theme.colors.background]);

  const value = useMemo(() => theme, [theme]);
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): Theme {
  return use(ThemeContext);
}
