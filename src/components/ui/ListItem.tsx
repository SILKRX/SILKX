import type { ReactNode } from 'react';
import { View } from 'react-native';

import { makeStyles, motion, radii, sizes, spacing, typography, useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface ListItemProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  value?: string;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  badge?: number;
}

/** Строка меню/настроек: иконка, заголовок, значение, шеврон или произвольный элемент справа. */
export function ListItem({ title, subtitle, icon, value, right, onPress, chevron, destructive = false, badge }: ListItemProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const showChevron = chevron ?? Boolean(onPress && !right);
  const content = (
    <>
      {icon ? (
        <View style={[styles.iconBox, destructive && styles.iconBoxDanger]}>
          <Icon name={icon} size="md" color={destructive ? colors.danger : colors.gold} />
        </View>
      ) : null}
      <View style={styles.texts}>
        <Text variant="bodyStrong" color={destructive ? 'danger' : 'primary'} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySm" color="secondary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {badge !== undefined && badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      {value ? (
        <Text variant="bodySm" color="secondary" numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {right}
      {showChevron ? <Icon name="chevron-forward" size="sm" color={colors.textTertiary} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <PressableScale onPress={onPress} haptic="selection" scaleTo={motion.pressScaleSubtle} style={styles.row} accessibilityRole="button" accessibilityLabel={title}>
      {content}
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: sizes.touch + spacing.md,
  },
  iconBox: {
    width: sizes.iconButton.sm,
    height: sizes.iconButton.sm,
    borderRadius: radii.sm,
    backgroundColor: t.colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxDanger: {
    backgroundColor: t.colors.dangerSoft,
  },
  texts: {
    flex: 1,
    gap: spacing.xxs,
  },
  badge: {
    minWidth: spacing.xl,
    height: spacing.xl,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: t.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...typography.micro,
    color: t.colors.textOnGold,
  },
}));
