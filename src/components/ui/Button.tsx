import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, type StyleProp, View, type ViewStyle } from 'react-native';

import { gradients, makeStyles, opacity, radii, sizes, spacing, useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { type HapticKind, PressableScale } from './PressableScale';
import { Text } from './Text';

/** onDark — контурная кнопка для тёмных подложек (фото, графитовые карточки) в любой теме */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'onDark';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: IconName;
  rightIcon?: IconName;
  fullWidth?: boolean;
  haptic?: HapticKind | false;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  haptic = 'light',
  style,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const inactive = disabled || loading;

  const contentColor =
    variant === 'primary' ? colors.textOnGold : variant === 'danger' || variant === 'onDark' ? colors.white : colors.text;

  const height = sizes.button[size];
  const content = (
    <View style={[styles.content, size === 'sm' && styles.contentSm]}>
      {loading ? (
        <ActivityIndicator color={contentColor} />
      ) : (
        <>
          {leftIcon ? <Icon name={leftIcon} size={size === 'sm' ? 'sm' : 'md'} color={contentColor} /> : null}
          <Text variant={size === 'sm' ? 'buttonSm' : 'button'} style={{ color: contentColor }} numberOfLines={1}>
            {title}
          </Text>
          {rightIcon ? <Icon name={rightIcon} size={size === 'sm' ? 'sm' : 'md'} color={contentColor} /> : null}
        </>
      )}
    </View>
  );

  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      haptic={inactive ? false : haptic}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      testID={testID}
      style={[
        styles.base,
        { height },
        fullWidth && styles.fullWidth,
        variant === 'secondary' && styles.secondary,
        variant === 'outline' && styles.outline,
        variant === 'danger' && styles.danger,
        variant === 'onDark' && styles.onDark,
        disabled && styles.disabled,
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient colors={gradients.goldMetal} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  base: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  contentSm: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  secondary: {
    backgroundColor: t.colors.surfaceElevated,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  outline: {
    borderWidth: sizes.border,
    borderColor: t.colors.goldBorder,
    backgroundColor: t.colors.transparent,
  },
  danger: {
    backgroundColor: t.colors.danger,
  },
  onDark: {
    borderWidth: sizes.border,
    borderColor: t.colors.glassBorder,
    backgroundColor: t.colors.glassOnImage,
  },
  disabled: {
    opacity: opacity.disabled,
  },
}));
