import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { gradients, layout, makeStyles, radii, sizes, spacing, useTheme } from '@/theme';
import type { Coordinates } from '@/types/domain';

const COORD_DIGITS = 5;

interface LocationPickerProps {
  value: Coordinates | null;
  onChange: (coords: Coordinates) => void;
}

/** Веб-версия: карты недоступны, показываем выбранную точку (адрес выбирается из подсказок). */
export function LocationPicker({ value }: LocationPickerProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.deepBlue} style={StyleSheet.absoluteFill} />
      <View style={styles.pin}>
        <Icon name="home" size="sm" color={colors.textOnGold} />
      </View>
      {value ? (
        <Text variant="caption" color="white">
          {value.latitude.toFixed(COORD_DIGITS)}, {value.longitude.toFixed(COORD_DIGITS)}
        </Text>
      ) : null}
      <Text variant="caption" color="white" align="center" style={styles.note}>
        {t('catalog.mapUnavailable')}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    height: layout.masterPlanHeight,
    borderRadius: radii.xl,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  pin: {
    width: sizes.iconButton.md,
    height: sizes.iconButton.md,
    borderRadius: radii.pill,
    backgroundColor: t.colors.gold,
    borderWidth: sizes.borderStrong,
    borderColor: t.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    maxWidth: layout.textMaxWidth,
  },
}));
