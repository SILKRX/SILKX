import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { type ThemeColors, typography, type TypographyVariant, useTheme } from '@/theme';

export type TextColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'gold'
  | 'inverse'
  | 'onGold'
  | 'danger'
  | 'success'
  | 'warning'
  | 'white';

const COLOR_KEY: Record<TextColor, keyof ThemeColors> = {
  primary: 'text',
  secondary: 'textSecondary',
  tertiary: 'textTertiary',
  gold: 'goldText',
  inverse: 'textInverse',
  onGold: 'textOnGold',
  danger: 'danger',
  success: 'success',
  warning: 'warning',
  white: 'white',
};

const MAX_FONT_SCALE = 1.35;

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: TextColor;
  align?: 'left' | 'center' | 'right';
}

export function Text({ variant = 'body', color = 'primary', align, style, ...rest }: TextProps) {
  const { colors } = useTheme();
  return (
    <RNText
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      {...rest}
      style={[
        typography[variant],
        { color: colors[COLOR_KEY[color]] },
        variant === 'overline' && { textTransform: 'uppercase' },
        align !== undefined && { textAlign: align },
        style,
      ]}
    />
  );
}
