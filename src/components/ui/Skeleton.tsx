import { LinearGradient } from 'expo-linear-gradient';
import { createContext, type ReactNode, use, useEffect, useState } from 'react';
import { type DimensionValue, type LayoutChangeEvent, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { makeStyles, motion, radii, useTheme } from '@/theme';

const ShimmerContext = createContext<SharedValue<number> | null>(null);

/** Общий таймер шиммера — все скелетоны на экране мерцают синхронно. */
export function SkeletonGroup({ children }: { children: ReactNode }) {
  const progress = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (reduceMotion) return;
    progress.set(withRepeat(withTiming(1, { duration: motion.shimmer, easing: Easing.inOut(Easing.ease) }), -1, false));
  }, [progress, reduceMotion]);
  return <ShimmerContext value={progress}>{children}</ShimmerContext>;
}

interface SkeletonProps {
  width?: DimensionValue;
  height: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width = '100%', height, radius = radii.sm, style }: SkeletonProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const progress = use(ShimmerContext);
  const [boxWidth, setBoxWidth] = useState(0);

  const shimmerStyle = useAnimatedStyle(() => {
    const p = progress ? progress.get() : 0;
    return { transform: [{ translateX: -boxWidth + p * boxWidth * 2 }] };
  });

  return (
    <View
      style={[styles.base, { width, height, borderRadius: radius }, style]}
      onLayout={(e: LayoutChangeEvent) => setBoxWidth(e.nativeEvent.layout.width)}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {progress && boxWidth > 0 ? (
        <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle]}>
          <LinearGradient
            colors={[colors.skeleton, colors.skeletonHighlight, colors.skeleton]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  base: {
    backgroundColor: t.colors.skeleton,
    overflow: 'hidden',
  },
}));
