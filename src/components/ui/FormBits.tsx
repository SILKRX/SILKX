import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { makeStyles, motion, radii, sizes, spacing, useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

type BannerTone = 'danger' | 'success' | 'info';

/** Встроенное сообщение формы вместо системных Alert-ов. */
export function FormBanner({ message, tone = 'danger' }: { message?: string; tone?: BannerTone }) {
  const styles = useStyles();
  const { colors } = useTheme();
  if (!message) return null;
  const palette = {
    danger: { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert-circle' as IconName },
    success: { bg: colors.successSoft, fg: colors.success, icon: 'checkmark-circle' as IconName },
    info: { bg: colors.infoSoft, fg: colors.info, icon: 'information-circle' as IconName },
  }[tone];
  return (
    <Animated.View
      entering={FadeIn.duration(motion.fast)}
      exiting={FadeOut.duration(motion.instant)}
      style={[styles.banner, { backgroundColor: palette.bg }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Icon name={palette.icon} size="md" color={palette.fg} />
      <Text variant="bodySm" style={[styles.bannerText, { color: palette.fg }]}>
        {message}
      </Text>
    </Animated.View>
  );
}

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  error?: string;
}

export function Checkbox({ checked, onChange, label, error }: CheckboxProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View>
      <Pressable
        onPress={() => {
          haptics.selection();
          onChange(!checked);
        }}
        style={styles.checkRow}
        hitSlop={sizes.hitSlop}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
      >
        <View style={[styles.box, checked && styles.boxChecked, Boolean(error) && !checked && styles.boxError]}>
          {checked ? <Icon name="checkmark" size="sm" color={colors.textOnGold} /> : null}
        </View>
        <Text variant="bodySm" color="secondary" style={styles.flex}>
          {label}
        </Text>
      </Pressable>
      {error ? (
        <Text variant="caption" color="danger" style={styles.checkError}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

interface ChoiceCardProps {
  title: string;
  description: string;
  icon: IconName;
  selected: boolean;
  onPress: () => void;
}

/** Крупная карточка выбора (роль при регистрации, тариф продвижения). */
export function ChoiceCard({ title, description, icon, selected, onPress }: ChoiceCardProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      scaleTo={motion.pressScaleSubtle}
      style={[styles.choice, selected && styles.choiceSelected]}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
    >
      <View style={[styles.choiceIcon, selected && styles.choiceIconSelected]}>
        <Icon name={icon} size="lg" color={selected ? colors.textOnGold : colors.gold} />
      </View>
      <View style={styles.flex}>
        <Text variant="title">{title}</Text>
        <Text variant="bodySm" color="secondary">
          {description}
        </Text>
      </View>
      <Icon name={selected ? 'radio-button-on' : 'radio-button-off'} size="md" color={selected ? colors.gold : colors.textTertiary} />
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  flex: {
    flex: 1,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  bannerText: {
    flex: 1,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  box: {
    width: sizes.icon.lg,
    height: sizes.icon.lg,
    borderRadius: radii.xs,
    borderWidth: sizes.borderStrong,
    borderColor: t.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: t.colors.gold,
    borderColor: t.colors.gold,
  },
  boxError: {
    borderColor: t.colors.danger,
  },
  checkError: {
    marginTop: spacing.xs,
    marginLeft: sizes.icon.lg + spacing.md,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  choiceSelected: {
    borderColor: t.colors.gold,
    backgroundColor: t.colors.goldSoft,
  },
  choiceIcon: {
    width: sizes.iconButton.lg,
    height: sizes.iconButton.lg,
    borderRadius: radii.md,
    backgroundColor: t.colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceIconSelected: {
    backgroundColor: t.colors.gold,
  },
}));
