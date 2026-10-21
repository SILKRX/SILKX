import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { sizes, useTheme } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];
export type IconSize = keyof typeof sizes.icon;

interface IconProps {
  name: IconName;
  size?: IconSize | number;
  color?: string;
  accessibilityLabel?: string;
}

export function Icon({ name, size = 'md', color, accessibilityLabel }: IconProps) {
  const { colors } = useTheme();
  const px = typeof size === 'number' ? size : sizes.icon[size];
  return (
    <Ionicons
      name={name}
      size={px}
      color={color ?? colors.text}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    />
  );
}

export const iconFont = Ionicons.font;
