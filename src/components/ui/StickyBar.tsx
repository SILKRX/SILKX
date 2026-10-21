import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { effects, makeStyles, sizes, spacing, useTheme } from '@/theme';

/** Нижняя «липкая» панель действий (Позвонить / Записаться) с размытием под контентом. */
export function StickyBar({ children }: { children: ReactNode }) {
  const styles = useStyles();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      {Platform.OS === 'ios' ? <BlurView intensity={effects.blurStrong} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> : null}
      <View style={[StyleSheet.absoluteFill, styles.background]} />
      <View style={styles.row}>{children}</View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: sizes.border,
    borderTopColor: t.colors.border,
    overflow: 'hidden',
  },
  background: {
    backgroundColor: t.colors.tabBar,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
}));
