import { Image } from 'expo-image';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Badge, Icon } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { elevation, layout, makeStyles, motion, radii, sizes, spacing, useTheme, zIndex } from '@/theme';

const COLUMNS = 3;
const LONG_PRESS_MS = 220;
const DRAG_SCALE = 1.06;

interface Slot {
  x: number;
  y: number;
}

function slotFor(index: number, size: number): Slot {
  'worklet';
  const column = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  return { x: column * (size + spacing.sm), y: row * (size + spacing.sm) };
}

interface TileProps {
  uri: string;
  index: number;
  count: number;
  size: number;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  onMakeCover: (index: number) => void;
}

/**
 * Плитка фото: удерживайте и перетаскивайте. Позиции целиком в shared values —
 * после перестановки плитки плавно «переезжают» на новые места без вспышек.
 */
function Tile({ uri, index, count, size, onMove, onRemove, onMakeCover }: TileProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const start = slotFor(index, size);
  const x = useSharedValue(start.x);
  const y = useSharedValue(start.y);
  const dragStartX = useSharedValue(start.x);
  const dragStartY = useSharedValue(start.y);
  const dragging = useSharedValue(false);

  useEffect(() => {
    const slot = slotFor(index, size);
    x.set(withTiming(slot.x, { duration: motion.base }));
    y.set(withTiming(slot.y, { duration: motion.base }));
  }, [index, size, x, y]);

  const vibrate = () => haptics.medium();
  const move = (from: number, to: number) => onMove(from, to);

  const pan = usePanGesture({
    activateAfterLongPress: LONG_PRESS_MS,
    onActivate: () => {
      'worklet';
      dragging.set(true);
      dragStartX.set(x.get());
      dragStartY.set(y.get());
      scheduleOnRN(vibrate);
    },
    onUpdate: (e) => {
      'worklet';
      x.set(dragStartX.get() + e.translationX);
      y.set(dragStartY.get() + e.translationY);
    },
    onDeactivate: () => {
      'worklet';
      const step = size + spacing.sm;
      const rows = Math.ceil(count / COLUMNS);
      const column = Math.min(Math.max(Math.round(x.get() / step), 0), COLUMNS - 1);
      const row = Math.min(Math.max(Math.round(y.get() / step), 0), rows - 1);
      const target = Math.min(row * COLUMNS + column, count - 1);
      const slot = slotFor(target, size);
      x.set(withSpring(slot.x, motion.spring));
      y.set(withSpring(slot.y, motion.spring));
      dragging.set(false);
      if (target !== index) scheduleOnRN(move, index, target);
    },
    onFinalize: () => {
      'worklet';
      if (!dragging.get()) return;
      dragging.set(false);
      const slot = slotFor(index, size);
      x.set(withSpring(slot.x, motion.spring));
      y.set(withSpring(slot.y, motion.spring));
    },
  });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: withTiming(dragging.get() ? DRAG_SCALE : 1, { duration: motion.fast }) }],
    zIndex: dragging.get() ? zIndex.overlay : zIndex.base,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.tile, { width: size, height: size }, style]}>
        <Image source={{ uri }} style={styles.image} contentFit="cover" transition={motion.fast} />
        {index === 0 ? (
          <View style={styles.cover} pointerEvents="none">
            <Badge tone="gold" icon="star" label={t('wizard.cover')} />
          </View>
        ) : (
          <Pressable style={styles.coverButton} onPress={() => onMakeCover(index)} hitSlop={sizes.hitSlop} accessibilityRole="button" accessibilityLabel={t('wizard.makeCover')}>
            <Icon name="star-outline" size="xs" color={colors.white} />
          </Pressable>
        )}
        <Pressable style={styles.remove} onPress={() => onRemove(index)} hitSlop={sizes.hitSlop} accessibilityRole="button" accessibilityLabel={t('common.delete')}>
          <Icon name="close" size="xs" color={colors.white} />
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

interface PhotoGridProps {
  photos: readonly string[];
  onChange: (photos: string[]) => void;
}

/** Сетка фото объявления с drag-and-drop сортировкой: первое фото — обложка. */
export function PhotoGrid({ photos, onChange }: PhotoGridProps) {
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const content = Math.min(width, layout.maxContentWidth) - layout.screenPadding * 2;
  const size = Math.floor((content - spacing.sm * (COLUMNS - 1)) / COLUMNS);
  const rows = Math.ceil(photos.length / COLUMNS);

  const move = (from: number, to: number) => {
    const next = [...photos];
    const [item] = next.splice(from, 1);
    if (item === undefined) return;
    next.splice(to, 0, item);
    onChange(next);
  };
  const remove = (index: number) => onChange(photos.filter((_, i) => i !== index));
  const makeCover = (index: number) => {
    haptics.selection();
    move(index, 0);
  };

  if (photos.length === 0) return null;

  return (
    <View style={[styles.grid, { height: rows * size + (rows - 1) * spacing.sm }]}>
      {photos.map((uri, index) => (
        <Tile key={uri} uri={uri} index={index} count={photos.length} size={size} onMove={move} onRemove={remove} onMakeCover={makeCover} />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  grid: {
    position: 'relative',
  },
  tile: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: t.colors.skeleton,
    ...elevation.card,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  cover: {
    position: 'absolute',
    left: spacing.xs,
    bottom: spacing.xs,
  },
  coverButton: {
    position: 'absolute',
    left: spacing.xs,
    bottom: spacing.xs,
    width: sizes.icon.lg,
    height: sizes.icon.lg,
    borderRadius: radii.pill,
    backgroundColor: t.colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remove: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: sizes.icon.lg,
    height: sizes.icon.lg,
    borderRadius: radii.pill,
    backgroundColor: t.colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
