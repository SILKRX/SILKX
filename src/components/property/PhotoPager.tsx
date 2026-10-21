import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { FlatList, type NativeScrollEvent, type NativeSyntheticEvent, Pressable, type StyleProp, View, type ViewStyle } from 'react-native';

import { makeStyles, motion, radii, sizes, spacing } from '@/theme';

const MAX_DOTS = 5;
const DOT_EDGE_SCALE = 0.66;

interface PhotoPagerProps {
  images: readonly string[];
  width: number;
  height: number;
  onPress?: (index: number) => void;
  onIndexChange?: (index: number) => void;
  showDots?: boolean;
  /** Листание внутри карточки каталога — без захода в объект */
  style?: StyleProp<ViewStyle>;
  recyclingKey?: string;
  priority?: 'low' | 'normal' | 'high';
}

/** Пагинированная галерея с точками (как в Airbnb). Фото кэшируются expo-image (memory + disk). */
export function PhotoPager({
  images,
  width,
  height,
  onPress,
  onIndexChange,
  showDots = true,
  style,
  recyclingKey,
  priority = 'normal',
}: PhotoPagerProps) {
  const styles = useStyles();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<string>>(null);

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== index) {
      setIndex(next);
      onIndexChange?.(next);
    }
  };

  const dots = buildDots(images.length, index);

  return (
    <View style={[{ width, height }, styles.root, style]}>
      <FlatList
        ref={listRef}
        data={images}
        keyExtractor={(uri, i) => `${uri}_${i}`}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        initialNumToRender={2}
        windowSize={3}
        renderItem={({ item, index: i }) => (
          <Pressable onPress={onPress ? () => onPress(i) : undefined} disabled={!onPress} accessibilityRole="imagebutton">
            <Image
              source={{ uri: item }}
              style={{ width, height }}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={motion.base}
              recyclingKey={recyclingKey ? `${recyclingKey}_${i}` : undefined}
              priority={i === 0 ? priority : 'low'}
            />
          </Pressable>
        )}
      />
      {showDots && images.length > 1 ? (
        <View style={styles.dots} pointerEvents="none">
          {dots.map((dot) => (
            <View key={dot.key} style={[styles.dot, dot.active && styles.dotActive, dot.small && styles.dotSmall]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Максимум 5 точек: активная всегда видна, крайние уменьшаются. */
function buildDots(total: number, active: number): { key: string; active: boolean; small: boolean }[] {
  if (total <= MAX_DOTS) return Array.from({ length: total }, (_, i) => ({ key: `d${i}`, active: i === active, small: false }));
  const start = Math.min(Math.max(active - 2, 0), total - MAX_DOTS);
  return Array.from({ length: MAX_DOTS }, (_, k) => {
    const i = start + k;
    const edge = (k === 0 && start > 0) || (k === MAX_DOTS - 1 && start + MAX_DOTS < total);
    return { key: `d${i}`, active: i === active, small: edge };
  });
}

const useStyles = makeStyles((t) => ({
  root: {
    overflow: 'hidden',
    backgroundColor: t.colors.skeleton,
  },
  dots: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs + spacing.xxs,
  },
  dot: {
    width: sizes.pagerDot,
    height: sizes.pagerDot,
    borderRadius: radii.pill,
    backgroundColor: t.colors.onImageMuted,
  },
  dotActive: {
    backgroundColor: t.colors.white,
    width: sizes.pagerDot + spacing.xxs,
    height: sizes.pagerDot + spacing.xxs,
  },
  dotSmall: {
    transform: [{ scale: DOT_EDGE_SCALE }],
  },
}));

