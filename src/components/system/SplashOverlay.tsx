import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';

import { Logo } from '@/components/ui';
import { motion, palette, sizes, zIndex } from '@/theme';

const HOLD_MS = 450;

/** Плавный переход от нативного сплэша к приложению: логотип мягко растворяется. */
export function SplashOverlay() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), HOLD_MS);
    return () => clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return (
    <Animated.View exiting={FadeOut.duration(motion.slow)} style={styles.overlay} pointerEvents="none">
      <Animated.View entering={ZoomIn.duration(motion.slower)}>
        <Logo height={sizes.logo.hero} onDark />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: palette.ink[900],
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: zIndex.max,
  },
});
