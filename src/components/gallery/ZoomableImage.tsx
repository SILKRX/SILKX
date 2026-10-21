import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import {
  GestureDetector,
  useExclusiveGestures,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, { type SharedValue, useAnimatedStyle, useSharedValue, withDecay, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { layout, motion } from '@/theme';

interface ZoomableImageProps {
  uri: string;
  width: number;
  height: number;
  /** Текущая страница галереи; при уходе со страницы зум сбрасывается */
  active: boolean;
  /** Общий для галереи сдвиг при свайпе вниз (затемняет фон) */
  dismissY: SharedValue<number>;
  onZoomChange: (zoomed: boolean) => void;
  onDismiss: () => void;
  onTap: () => void;
}

/**
 * Фото с жестами: щипок (зум к точке между пальцами), перетаскивание приближенного фото
 * с инерцией, двойной тап (приблизить/вернуть), одиночный тап (скрыть интерфейс),
 * свайп вниз — закрыть галерею. Всё считается на UI-потоке.
 */
export function ZoomableImage({ uri, width, height, active, dismissY, onZoomChange, onDismiss, onTap }: ZoomableImageProps) {
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const pinchStartScale = useSharedValue(1);
  const pinchStartX = useSharedValue(0);
  const pinchStartY = useSharedValue(0);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const panStartX = useSharedValue(0);
  const panStartY = useSharedValue(0);
  const zoomed = useSharedValue(false);
  const notZoomed = useSharedValue(true);

  const emitZoom = (value: boolean) => onZoomChange(value);
  const emitDismiss = () => onDismiss();
  const emitTap = () => onTap();

  useEffect(() => {
    if (active) return;
    scale.set(1);
    tx.set(0);
    ty.set(0);
    zoomed.set(false);
    notZoomed.set(true);
  }, [active, notZoomed, scale, tx, ty, zoomed]);

  const setZoomed = (value: boolean) => {
    'worklet';
    if (zoomed.get() === value) return;
    zoomed.set(value);
    notZoomed.set(!value);
    scheduleOnRN(emitZoom, value);
  };

  const maxOffsetX = (s: number) => {
    'worklet';
    return Math.max(0, (width * s - width) / 2);
  };
  const maxOffsetY = (s: number) => {
    'worklet';
    return Math.max(0, (height * s - height) / 2);
  };
  const clamp = (value: number, limit: number) => {
    'worklet';
    return Math.min(Math.max(value, -limit), limit);
  };

  const resetZoom = () => {
    'worklet';
    scale.set(withTiming(1, { duration: motion.base }));
    tx.set(withTiming(0, { duration: motion.base }));
    ty.set(withTiming(0, { duration: motion.base }));
    setZoomed(false);
  };

  const pinch = usePinchGesture({
    onActivate: (e) => {
      'worklet';
      pinchStartScale.set(scale.get());
      pinchStartX.set(tx.get());
      pinchStartY.set(ty.get());
      originX.set(e.focalX - width / 2);
      originY.set(e.focalY - height / 2);
    },
    onUpdate: (e) => {
      'worklet';
      const next = Math.min(Math.max(pinchStartScale.get() * e.scale, motion.zoomUndershoot), motion.zoomMax);
      const ratio = next / pinchStartScale.get();
      scale.set(next);
      // Точка под пальцами остаётся на месте: t1 = F − (F − t0)·(s1/s0)
      tx.set(originX.get() - (originX.get() - pinchStartX.get()) * ratio);
      ty.set(originY.get() - (originY.get() - pinchStartY.get()) * ratio);
    },
    onDeactivate: () => {
      'worklet';
      const s = scale.get();
      if (s <= 1) {
        resetZoom();
        return;
      }
      tx.set(withTiming(clamp(tx.get(), maxOffsetX(s)), { duration: motion.fast }));
      ty.set(withTiming(clamp(ty.get(), maxOffsetY(s)), { duration: motion.fast }));
      setZoomed(true);
    },
  });

  const pan = usePanGesture({
    enabled: zoomed,
    maxPointers: 1,
    onActivate: () => {
      'worklet';
      panStartX.set(tx.get());
      panStartY.set(ty.get());
    },
    onUpdate: (e) => {
      'worklet';
      tx.set(panStartX.get() + e.translationX);
      ty.set(panStartY.get() + e.translationY);
    },
    onDeactivate: (e) => {
      'worklet';
      const s = scale.get();
      const limitX = maxOffsetX(s);
      const limitY = maxOffsetY(s);
      tx.set(withDecay({ velocity: e.velocityX, clamp: [-limitX, limitX] }));
      ty.set(withDecay({ velocity: e.velocityY, clamp: [-limitY, limitY] }));
    },
  });

  const dismissPan = usePanGesture({
    enabled: notZoomed,
    maxPointers: 1,
    activeOffsetY: [-layout.swipeActivation, layout.swipeActivation],
    failOffsetX: [-layout.swipeActivation, layout.swipeActivation],
    onUpdate: (e) => {
      'worklet';
      dismissY.set(e.translationY);
    },
    onDeactivate: (e) => {
      'worklet';
      const far = Math.abs(e.translationY) > layout.dismissDistance;
      const fast = Math.abs(e.velocityY) > layout.dismissVelocity;
      if (far || fast) {
        scheduleOnRN(emitDismiss);
        return;
      }
      dismissY.set(withSpring(0, motion.spring));
    },
  });

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onActivate: (e) => {
      'worklet';
      if (scale.get() > 1) {
        resetZoom();
        return;
      }
      const k = motion.zoomDoubleTap;
      const ox = e.x - width / 2;
      const oy = e.y - height / 2;
      scale.set(withTiming(k, { duration: motion.base }));
      tx.set(withTiming(clamp(-ox * (k - 1), maxOffsetX(k)), { duration: motion.base }));
      ty.set(withTiming(clamp(-oy * (k - 1), maxOffsetY(k)), { duration: motion.base }));
      setZoomed(true);
    },
  });

  const singleTap = useTapGesture({
    onActivate: () => {
      'worklet';
      scheduleOnRN(emitTap);
    },
  });

  const taps = useExclusiveGestures(doubleTap, singleTap);
  const gesture = useSimultaneousGestures(pinch, pan, dismissPan, taps);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.get() },
      { translateY: ty.get() + (zoomed.get() ? 0 : dismissY.get()) },
      { scale: scale.get() },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ width, height }, styles.root]}>
        <Animated.View style={[StyleSheet.absoluteFill, imageStyle]}>
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="contain" cachePolicy="memory-disk" transition={motion.fast} />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
});
