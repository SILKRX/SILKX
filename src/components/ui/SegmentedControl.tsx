import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, Pressable, type StyleProp, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { elevation, makeStyles, motion, radii, sizes, spacing, useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  /** compact — для шапок (высота как у чипа) */
  compact?: boolean;
}

export function SegmentedControl<T extends string>({ options, value, onChange, style, compact = false }: SegmentedControlProps<T>) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segmentWidth = options.length > 0 ? (width - spacing.xs * 2) / options.length : 0;
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateX.set(withSpring(index * segmentWidth, motion.spring));
  }, [index, segmentWidth, translateX]);

  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.get() }] }));

  return (
    <View
      style={[styles.container, compact && styles.compact, style]}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
    >
      {width > 0 ? <Animated.View style={[styles.indicator, { width: segmentWidth }, indicatorStyle]} /> : null}
      {options.map((option) => {
        const selected = option.value === value;
        const color = selected ? colors.textOnGold : colors.textSecondary;
        return (
          <Pressable
            key={option.value}
            style={styles.segment}
            onPress={() => {
              if (selected) return;
              haptics.selection();
              onChange(option.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            {option.icon ? <Icon name={option.icon} size="sm" color={color} /> : null}
            <Text variant="buttonSm" style={{ color }} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flexDirection: 'row',
    height: sizes.button.md - spacing.xs,
    padding: spacing.xs,
    borderRadius: radii.lg,
    backgroundColor: t.colors.surfaceMuted,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  compact: {
    height: sizes.chip + spacing.xs * 2,
    borderRadius: radii.pill,
  },
  indicator: {
    position: 'absolute',
    top: spacing.xs,
    bottom: spacing.xs,
    left: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: t.colors.gold,
    ...elevation.card,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + spacing.xxs,
  },
}));
