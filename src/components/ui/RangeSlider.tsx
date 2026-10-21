import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import { GestureDetector, useExclusiveGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptics } from '@/lib/haptics';
import { makeStyles, motion, radii, sizes, spacing } from '@/theme';

import { clampValue, positionToValue, useSliderStyles, valueToPosition } from './Slider';

const THUMB = sizes.slider.thumb;
const ACTIVE_OFFSET_X: [number, number] = [-spacing.xs, spacing.xs];
const FAIL_OFFSET_Y: [number, number] = [-spacing.md, spacing.md];

export interface RangeValue {
  low: number;
  high: number;
}

interface RangeSliderProps {
  min: number;
  max: number;
  step: number;
  value: RangeValue;
  onChange: (value: RangeValue) => void;
  onChangeEnd?: (value: RangeValue) => void;
  /** Высоты столбцов гистограммы (количество объектов в ценовых корзинах) */
  histogram?: readonly number[];
}

/** Диапазон с двумя ползунками и гистограммой распределения цен (как в Airbnb). */
export function RangeSlider({ min, max, step, value, onChange, onChangeEnd, histogram }: RangeSliderProps) {
  const sliderStyles = useSliderStyles();
  const styles = useStyles();
  const [width, setWidth] = useState(0);
  const trackWidth = Math.max(width - THUMB, 0);

  const low = useSharedValue(0);
  const high = useSharedValue(0);
  const active = useSharedValue<0 | 1>(0);
  const dragging = useSharedValue(false);
  const lowValue = useSharedValue(value.low);
  const highValue = useSharedValue(value.high);

  useEffect(() => {
    lowValue.set(value.low);
    highValue.set(value.high);
    if (dragging.get()) return;
    low.set(withTiming(valueToPosition(value.low, trackWidth, min, max), { duration: motion.fast }));
    high.set(withTiming(valueToPosition(value.high, trackWidth, min, max), { duration: motion.fast }));
  }, [dragging, high, highValue, low, lowValue, max, min, trackWidth, value.high, value.low]);

  const emitChange = (next: RangeValue) => {
    haptics.selection();
    onChange(next);
  };
  const emitEnd = (next: RangeValue) => onChangeEnd?.(next);

  const pickThumb = (x: number) => {
    'worklet';
    const center = x - THUMB / 2;
    active.set(Math.abs(center - low.get()) <= Math.abs(center - high.get()) ? 0 : 1);
  };

  const moveActive = (x: number) => {
    'worklet';
    const minGap = trackWidth > 0 ? (step / (max - min)) * trackWidth : 0;
    const target = clampValue(x - THUMB / 2, 0, trackWidth);
    if (active.get() === 0) {
      const next = Math.min(target, high.get() - minGap);
      low.set(Math.max(0, next));
    } else {
      const next = Math.max(target, low.get() + minGap);
      high.set(Math.min(trackWidth, next));
    }
    const nextLow = positionToValue(low.get(), trackWidth, min, max, step);
    const nextHigh = positionToValue(high.get(), trackWidth, min, max, step);
    if (nextLow !== lowValue.get() || nextHigh !== highValue.get()) {
      lowValue.set(nextLow);
      highValue.set(nextHigh);
      scheduleOnRN(emitChange, { low: nextLow, high: nextHigh });
    }
  };

  const settle = () => {
    'worklet';
    low.set(withTiming(valueToPosition(lowValue.get(), trackWidth, min, max), { duration: motion.instant }));
    high.set(withTiming(valueToPosition(highValue.get(), trackWidth, min, max), { duration: motion.instant }));
    scheduleOnRN(emitEnd, { low: lowValue.get(), high: highValue.get() });
  };

  const pan = usePanGesture({
    activeOffsetX: ACTIVE_OFFSET_X,
    failOffsetY: FAIL_OFFSET_Y,
    onBegin: (e) => {
      'worklet';
      pickThumb(e.x);
    },
    onActivate: (e) => {
      'worklet';
      dragging.set(true);
      moveActive(e.x);
    },
    onUpdate: (e) => {
      'worklet';
      moveActive(e.x);
    },
    onFinalize: () => {
      'worklet';
      if (!dragging.get()) return;
      dragging.set(false);
      settle();
    },
  });

  const tap = useTapGesture({
    onActivate: (e) => {
      'worklet';
      pickThumb(e.x);
      moveActive(e.x);
      settle();
    },
  });

  const gesture = useExclusiveGestures(pan, tap);

  const fillStyle = useAnimatedStyle(() => ({ left: low.get() + THUMB / 2, width: Math.max(high.get() - low.get(), 0) }));
  const lowThumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: low.get() }] }));
  const highThumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: high.get() }] }));

  const maxCount = histogram && histogram.length > 0 ? Math.max(...histogram, 1) : 1;
  const bucketSize = histogram && histogram.length > 0 ? (max - min) / histogram.length : 0;

  return (
    <View>
      {histogram && histogram.length > 0 ? (
        <View style={styles.histogram} pointerEvents="none">
          {histogram.map((count, i) => {
            const from = min + i * bucketSize;
            const to = from + bucketSize;
            const inRange = to > value.low && from < value.high;
            return (
              <View
                key={`bar_${i}`}
                style={[
                  styles.bar,
                  { height: Math.max((count / maxCount) * sizes.slider.histogram, spacing.xxs) },
                  inRange ? styles.barActive : styles.barInactive,
                ]}
              />
            );
          })}
        </View>
      ) : null}
      <GestureDetector gesture={gesture}>
        <View style={sliderStyles.root} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
          <View style={sliderStyles.track} />
          <Animated.View style={[styles.fill, fillStyle]} />
          <Animated.View style={[sliderStyles.thumb, lowThumbStyle]} />
          <Animated.View style={[sliderStyles.thumb, highThumbStyle]} />
        </View>
      </GestureDetector>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  histogram: {
    height: sizes.slider.histogram,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xxs,
    paddingHorizontal: THUMB / 2,
  },
  bar: {
    flex: 1,
    borderTopLeftRadius: radii.xs / 2,
    borderTopRightRadius: radii.xs / 2,
  },
  barActive: {
    backgroundColor: t.colors.gold,
  },
  barInactive: {
    backgroundColor: t.colors.surfacePressed,
  },
  fill: {
    position: 'absolute',
    height: sizes.slider.track,
    borderRadius: radii.pill,
    backgroundColor: t.colors.gold,
  },
}));
