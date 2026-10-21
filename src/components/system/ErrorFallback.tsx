import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Icon, Text } from '@/components/ui';
import { layout, makeStyles, sizes, spacing, useTheme } from '@/theme';

interface ErrorFallbackProps {
  onRetry: () => void;
  onGoHome?: () => void;
  details?: string;
}

/** «Упс, что-то пошло не так» — вместо вылета приложения. */
export function ErrorFallback({ onRetry, onGoHome, details }: ErrorFallbackProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Icon name="construct-outline" size="xxl" color={colors.gold} />
        </View>
        <Text variant="h2" align="center">
          {t('errors.boundaryTitle')}
        </Text>
        <Text color="secondary" align="center" style={styles.text}>
          {t('errors.boundaryText')}
        </Text>
        {__DEV__ && details ? (
          <Text variant="caption" color="tertiary" align="center" numberOfLines={4} style={styles.text}>
            {details}
          </Text>
        ) : null}
        <Button title={t('errors.reload')} onPress={onRetry} leftIcon="refresh" style={styles.button} />
        {onGoHome ? <Button title={t('errors.goHome')} onPress={onGoHome} variant="ghost" style={styles.button} /> : null}
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  iconCircle: {
    width: sizes.avatar.xl,
    height: sizes.avatar.xl,
    borderRadius: sizes.avatar.xl / 2,
    backgroundColor: t.colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  text: {
    maxWidth: layout.textMaxWidth,
  },
  button: {
    alignSelf: 'center',
  },
}));
