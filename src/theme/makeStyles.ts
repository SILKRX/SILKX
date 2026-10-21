import { type ImageStyle, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { type Theme, themes, useTheme } from './ThemeProvider';

type NamedStyles<T> = { readonly [P in keyof T]: ViewStyle | TextStyle | ImageStyle };
type StyleSheetInput = Parameters<typeof StyleSheet.create>[0];

function createSheet<T>(styles: T): T {
  return StyleSheet.create(styles as unknown as StyleSheetInput) as unknown as T;
}

/**
 * Фабрика тематических стилей. Оба варианта (light/dark) создаются один раз при импорте
 * модуля — в рендере нет аллокаций и побочных эффектов (совместимо с React Compiler).
 *
 * const useStyles = makeStyles((t) => ({ root: { backgroundColor: t.colors.surface } }));
 * const styles = useStyles();
 */
export function makeStyles<T extends NamedStyles<T>>(factory: (theme: Theme) => T): () => T {
  const sheets = {
    light: createSheet(factory(themes.light)),
    dark: createSheet(factory(themes.dark)),
  };
  return function useStyles(): T {
    return sheets[useTheme().scheme];
  };
}
