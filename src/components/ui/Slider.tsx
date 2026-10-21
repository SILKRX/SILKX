import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import { GestureDetector, useExclusiveGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptics } from '@/lib/haptics';
import { elevation, makeStyles, motion, radii, sizes, spacing } from '@/theme';

const THUMB = sizes.slider.thumb;
const ACTIVE_OFFSET_X: [number, number] = [-spacing.xs, spacing.xs];
const FAIL_OFFSET_Y: [number, number] = [-spacing.md, spacing.md];

export function clampValue(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

export function positionToValue(position: number, trackWidth: number, min: number, max: number, step: number): number {
  'worklet';
  if (trackWidth <= 0) return min;
  const raw = min + (position / trackWidth) * (max - min);
  const stepped = Math.round((raw - min) / step) * step + min;
  return clampValue(stepped, min, max);
}

export function valueToPosition(value: number, trackWidth: number, min: number, max: number): number {
  'worklet';
  if (max <= min) return 0;
  return ((clampValue(value, min, max) - min) / (max - min)) * trackWidth;
}

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  onChangeEnd?: (value: number) => void;
  accessibilityLabel?: string;
}

/** Слайдер на Gesture Handler + Reanimated: тянется на UI-потоке, наружу отдаёт шагнутое значение. */
export function Slider({ value, min, max, step, onChange, onChangeEnd, accessibilityLabel }: SliderProps) {
  const styles = useStyles();
  const [width, setWidth] = useState(0);
  const trackWidth = Math.max(width - THUMB, 0);

  const position = useSharedValue(0);
  const dragging = useSharedValue(false);
  const lastValue = useSharedValue(value);

  useEffect(() => {
    lastValue.set(value);
    if (!dragging.get()) position.set(withTiming(valueToPosition(value, trackWidth, min, max), { duration: motion.fast }));
  }, [dragging, lastValue, max, min, position, trackWidth, value]);

  const emitChange = (next: number) => {
    haptics.selection();
    onChange(next);
  };
  const emitEnd = (next: number) => onChangeEnd?.(next);

  const moveTo = (x: number) => {
    'worklet';
    const clamped = clampValue(x - THUMB / 2, 0, trackWidth);
    position.set(clamped);
    const next = positionToValue(clamped, trackWidth, min, max, step);
    if (next !== lastValue.get()) {
      lastValue.set(next);
      scheduleOnRN(emitChange, next);
    }
  };

  const pan = usePanGesture({
    activeOffsetX: ACTIVE_OFFSET_X,
    failOffsetY: FAIL_OFFSET_Y,
    onActivate: (e) => {
      'worklet';
      dragging.set(true);
      moveTo(e.x);
    },
    onUpdate: (e) => {
      'worklet';
      moveTo(e.x);
    },
    onFinalize: () => {
      'worklet';
      if (!dragging.get()) return;
      dragging.set(false);
      position.set(withTiming(valueToPosition(lastValue.get(), trackWidth, min, max), { duration: motion.instant }));
      scheduleOnRN(emitEnd, lastValue.get());
    },
  });

  const tap = useTapGesture({
    onActivate: (e) => {
      'worklet';
      moveTo(e.x);
      position.set(withTiming(valueToPosition(lastValue.get(), trackWidth, min, max), { duration: motion.fast }));
      scheduleOnRN(emitEnd, lastValue.get());
    },
  });

  const gesture = useExclusiveGestures(pan, tap);

  const fillStyle = useAnimatedStyle(() => ({ width: position.get() + THUMB / 2 }));
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: position.get() }] }));

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={styles.root}
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ min, max, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          const next = clampValue(value + (event.nativeEvent.actionName === 'increment' ? step : -step), min, max);
          onChange(next);
          onChangeEnd?.(next);
        }}
      >
        <View style={styles.track} />
        <Animated.View style={[styles.fill, fillStyle]} />
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </View>
    </GestureDetector>
  );
}

export const useSliderStyles = makeStyles((t) => ({
  root: {
    height: THUMB + spacing.md,
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    left: THUMB / 2,
    right: THUMB / 2,
    height: sizes.slider.track,
    borderRadius: radii.pill,
    backgroundColor: t.colors.surfacePressed,
  },
  fill: {
    position: 'absolute',
    left: THUMB / 2,
    height: sizes.slider.track,
    borderRadius: radii.pill,
    backgroundColor: t.colors.gold,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: t.colors.white,
    borderWidth: sizes.borderStrong,
    borderColor: t.colors.gold,
    ...elevation.card,
  },
}));

const useStyles = useSliderStyles;
