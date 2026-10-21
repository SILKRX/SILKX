import { LinearGradient } from 'expo-linear-gradient';
import { type StyleProp, View, type ViewStyle } from 'react-native';

import { gradients, makeStyles, radii, spacing, type ThemeColors, typography, useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type BadgeTone = 'gold' | 'goldSoft' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'glass';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

const TONES: Record<Exclude<BadgeTone, 'gold'>, { bg: keyof ThemeColors; fg: keyof ThemeColors }> = {
  goldSoft: { bg: 'goldSoft', fg: 'goldText' },
  success: { bg: 'successSoft', fg: 'success' },
  warning: { bg: 'warningSoft', fg: 'warning' },
  danger: { bg: 'dangerSoft', fg: 'danger' },
  info: { bg: 'infoSoft', fg: 'info' },
  neutral: { bg: 'surfaceMuted', fg: 'textSecondary' },
  glass: { bg: 'glassOnImage', fg: 'white' },
};

export function Badge({ label, tone = 'goldSoft', icon, style }: BadgeProps) {
  const styles = useStyles();
  const { colors } = useTheme();

  if (tone === 'gold') {
    return (
      <LinearGradient colors={gradients.goldMetal} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.badge, style]}>
        {icon ? <Icon name={icon} size="xs" color={colors.textOnGold} /> : null}
        <Text style={[styles.text, { color: colors.textOnGold }]}>{label}</Text>
      </LinearGradient>
    );
  }

  const palette = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: colors[palette.bg] }, style]}>
      {icon ? <Icon name={icon} size="xs" color={colors[palette.fg]} /> : null}
      <Text style={[styles.text, { color: colors[palette.fg] }]}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  text: {
    ...typography.micro,
  },
}));
