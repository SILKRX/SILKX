import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { openInMaps } from '@/lib/linking';
import { elevation, gradients, layout, makeStyles, radii, sizes, spacing, useTheme } from '@/theme';
import type { Coordinates } from '@/types/domain';

/** Веб-заглушка мини-карты: react-native-maps не работает в браузере — открываем Google Maps. */
export function MiniMap({ coords, label }: { coords: Coordinates; label: string }) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Pressable onPress={() => void openInMaps(coords, label)} style={styles.root} accessibilityRole="link" accessibilityLabel={t('property.openInMaps')}>
      <LinearGradient colors={gradients.deepBlue} style={StyleSheet.absoluteFill} />
      <View style={styles.pin}>
        <Icon name="home" size="sm" color={colors.textOnGold} />
      </View>
      <Text variant="bodySm" color="white" align="center" numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.pill}>
        <Icon name="navigate-outline" size="xs" color={colors.gold} />
        <Text variant="caption">{t('property.openInMaps')}</Text>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    height: layout.miniMapHeight,
    borderRadius: radii.xl,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  pin: {
    width: sizes.iconButton.sm,
    height: sizes.iconButton.sm,
    borderRadius: radii.pill,
    backgroundColor: t.colors.gold,
    borderWidth: sizes.borderStrong,
    borderColor: t.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.gold,
  },
  pill: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + spacing.xxs,
    borderRadius: radii.pill,
    backgroundColor: t.colors.surfaceElevated,
  },
}));
