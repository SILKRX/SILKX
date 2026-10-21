import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { makeStyles, radii, sizes, spacing, useTheme } from '@/theme';

import { passwordStrength } from './schemas';

const SEGMENTS = [1, 2, 3, 4] as const;
const LABEL_KEYS = ['auth.strength.weak', 'auth.strength.weak', 'auth.strength.medium', 'auth.strength.strong', 'auth.strength.excellent'] as const;

/** Индикатор надёжности пароля: четыре сегмента от красного к золотому. */
export function PasswordStrengthMeter({ password }: { password: string }) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const score = passwordStrength(password);
  if (score === 0) return null;
  const color = score <= 1 ? colors.danger : score === 2 ? colors.warning : score === 3 ? colors.success : colors.gold;
  return (
    <View style={styles.root} accessibilityLabel={`${t('auth.strength.label')}: ${t(LABEL_KEYS[score])}`}>
      <View style={styles.bars}>
        {SEGMENTS.map((segment) => (
          <View key={segment} style={[styles.bar, { backgroundColor: segment <= score ? color : colors.surfacePressed }]} />
        ))}
      </View>
      <Text variant="caption" color="secondary">
        {t('auth.strength.label')}: <Text variant="caption" style={{ color }}>{t(LABEL_KEYS[score])}</Text>
      </Text>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  root: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  bars: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  bar: {
    flex: 1,
    height: sizes.progress,
    borderRadius: radii.pill,
  },
}));
