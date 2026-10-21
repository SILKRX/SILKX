import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { gradients, gradientStops, motion, useTheme } from '@/theme';

const heroImage = require('../../../assets/images/hero-tashkent.jpg') as number;

interface AnimatedHeroProps {
  height: number;
  scrollY: SharedValue<number>;
  children: ReactNode;
}

/**
 * «Живой» фон главной: панорама Ташкента медленно зумится и панорамирует по кругу
 * (Reanimated, UI-поток), плюс параллакс при скролле и растяжение при оттягивании вниз.
 * При включённом «Уменьшении движения» в системе анимация не запускается.
 */
export function AnimatedHero({ height, scrollY, children }: AnimatedHeroProps) {
  const { isDark } = useTheme();
  const reduceMotion = useReducedMotion();
  const loop = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    loop.set(withRepeat(withTiming(1, { duration: motion.heroLoop, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(loop);
  }, [loop, reduceMotion]);

  const imageStyle = useAnimatedStyle(() => {
    const y = scrollY.get();
    const pull = y < 0 ? -y : 0;
    const progress = loop.get();
    return {
      transform: [
        { translateY: y > 0 ? y * motion.heroParallax : y / 2 },
        { scale: interpolate(progress, [0, 1], [motion.heroBaseZoom, motion.heroZoom]) + pull / height },
        { translateX: interpolate(progress, [0, 1], [-motion.heroPan, motion.heroPan]) },
      ],
    };
  });

  return (
    <View style={[styles.root, { height }]}>
      <Animated.View style={[StyleSheet.absoluteFill, imageStyle]}>
        <Image source={heroImage} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory" />
      </Animated.View>
      <LinearGradient
        colors={isDark ? gradients.heroOverlay : gradients.heroOverlayLight}
        locations={gradientStops.hero}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
});
