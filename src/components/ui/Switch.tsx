import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { makeStyles, motion, opacity, sizes, spacing, useTheme } from '@/theme';

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

const TRAVEL = sizes.switch.width - sizes.switch.thumb - spacing.xs;

/** Золотой тумблер с плавной анимацией (одинаково выглядит на iOS и Android). */
export function Switch({ value, onValueChange, disabled = false, accessibilityLabel }: SwitchProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.set(withSpring(value ? 1 : 0, motion.spring));
  }, [progress, value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.get(), [0, 1], [colors.surfacePressed, colors.gold]),
  }));
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: progress.get() * TRAVEL }] }));

  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onValueChange(!value);
      }}
      disabled={disabled}
      hitSlop={sizes.hitSlop}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={disabled ? styles.disabled : undefined}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  track: {
    width: sizes.switch.width,
    height: sizes.switch.height,
    borderRadius: sizes.switch.height / 2,
    padding: (sizes.switch.height - sizes.switch.thumb) / 2,
    justifyContent: 'center',
  },
  thumb: {
    width: sizes.switch.thumb,
    height: sizes.switch.thumb,
    borderRadius: sizes.switch.thumb / 2,
    backgroundColor: t.colors.white,
    shadowColor: t.colors.shadow,
    shadowOpacity: 0.2,
    shadowRadius: spacing.xs,
    shadowOffset: { width: 0, height: spacing.xxs },
    elevation: 2,
  },
  disabled: {
    opacity: opacity.disabled,
  },
}));
