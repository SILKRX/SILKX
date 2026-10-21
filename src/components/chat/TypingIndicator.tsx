import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  FadeIn,
  FadeOut,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { layout, makeStyles, motion, opacity, radii, sizes, spacing } from '@/theme';

const DOTS = [0, 1, 2] as const;
const LIFT = spacing.xs;

function Dot({ progress }: { progress: SharedValue<number> }) {
  const styles = useStyles();
  const style = useAnimatedStyle(() => ({
    opacity: opacity.muted + (1 - opacity.muted) * progress.get(),
    transform: [{ translateY: -LIFT * progress.get() }],
  }));
  return <Animated.View style={[styles.dot, style]} />;
}

/** «Собеседник печатает…» — три прыгающих точки в пузыре. */
export function TypingIndicator() {
  const styles = useStyles();
  const reduceMotion = useReducedMotion();
  const a = useSharedValue(0);
  const b = useSharedValue(0);
  const c = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    const step = motion.typing / DOTS.length;
    const pulse = () => withRepeat(withSequence(withTiming(1, { duration: step }), withTiming(0, { duration: step })), -1, false);
    a.set(pulse());
    b.set(withDelay(step / 2, pulse()));
    c.set(withDelay(step, pulse()));
    return () => {
      cancelAnimation(a);
      cancelAnimation(b);
      cancelAnimation(c);
    };
  }, [a, b, c, reduceMotion]);

  return (
    <Animated.View entering={FadeIn.duration(motion.fast)} exiting={FadeOut.duration(motion.fast)} style={styles.row}>
      <View style={styles.bubble}>
        <Dot progress={a} />
        <Dot progress={b} />
        <Dot progress={c} />
      </View>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.xs,
    alignItems: 'flex-start',
  },
  bubble: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderBottomLeftRadius: radii.xs,
    backgroundColor: t.colors.bubbleOther,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  dot: {
    width: sizes.badgeDot,
    height: sizes.badgeDot,
    borderRadius: radii.pill,
    backgroundColor: t.colors.textSecondary,
  },
}));
