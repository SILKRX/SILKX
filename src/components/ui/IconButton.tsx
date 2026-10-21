import { BlurView } from 'expo-blur';
import { Platform, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { effects, makeStyles, opacity, radii, sizes, spacing, typography, useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { type HapticKind, PressableScale } from './PressableScale';
import { Text } from './Text';

type IconButtonVariant = 'surface' | 'glass' | 'ghost' | 'gold';
type IconButtonSize = keyof typeof sizes.iconButton;

interface IconButtonProps {
  icon: IconName;
  onPress?: () => void;
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  color?: string;
  badge?: number;
  haptic?: HapticKind | false;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const MAX_BADGE = 99;

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'surface',
  size = 'md',
  color,
  badge,
  haptic = 'selection',
  disabled,
  style,
}: IconButtonProps) {
  const styles = useStyles();
  const { colors, isDark } = useTheme();
  const dimension = sizes.iconButton[size];
  const iconColor =
    color ?? (variant === 'gold' ? colors.textOnGold : variant === 'glass' ? colors.white : colors.text);

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      haptic={haptic}
      hitSlop={sizes.hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.base,
        { width: dimension, height: dimension, borderRadius: dimension / 2 },
        variant === 'surface' && styles.surface,
        variant === 'gold' && styles.gold,
        disabled && styles.disabled,
        style,
      ]}
    >
      {variant === 'glass' ? (
        Platform.OS === 'ios' ? (
          <BlurView intensity={effects.blur} tint={isDark ? 'dark' : 'systemThinMaterialDark'} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.glassFallback]} />
        )
      ) : null}
      <Icon name={icon} size={size === 'sm' ? 'sm' : 'md'} color={iconColor} />
      {badge !== undefined && badge > 0 ? (
        <View style={styles.badge} accessibilityLabel={String(badge)}>
          <Text style={styles.badgeText}>{badge > MAX_BADGE ? `${MAX_BADGE}+` : badge}</Text>
        </View>
      ) : null}
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  surface: {
    backgroundColor: t.colors.surfaceElevated,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  gold: {
    backgroundColor: t.colors.gold,
  },
  glassFallback: {
    backgroundColor: t.colors.glassOnImage,
    borderRadius: radii.pill,
  },
  disabled: {
    opacity: opacity.disabled,
  },
  badge: {
    position: 'absolute',
    top: -spacing.xxs,
    right: -spacing.xxs,
    minWidth: spacing.lg + spacing.xxs,
    height: spacing.lg + spacing.xxs,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: t.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: sizes.borderStrong,
    borderColor: t.colors.background,
  },
  badgeText: {
    ...typography.micro,
    color: t.colors.textOnGold,
  },
}));
