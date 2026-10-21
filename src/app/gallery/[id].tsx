import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, type NativeScrollEvent, type NativeSyntheticEvent, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeOut, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ZoomableImage } from '@/components/gallery/ZoomableImage';
import { IconButton, Text } from '@/components/ui';
import { useComplex, useProperty } from '@/hooks/api/catalog';
import { useFocusedStatusBar } from '@/hooks/useStatusBar';
import { analytics } from '@/lib/analytics';
import { layout, makeStyles, motion, opacity, radii, sizes, spacing, useTheme } from '@/theme';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

const BACKGROUND_MIN_OPACITY = 0.3;

/** Полноэкранная галерея: листание, pinch-to-zoom, двойной тап, свайп вниз для закрытия. */
export default function GalleryScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams<{ id: string; index?: string; source?: string }>();
  const id = params.id ?? '';
  const isComplex = params.source === 'complex';

  const property = useProperty(id, { enabled: !isComplex });
  const complex = useComplex(id, { enabled: isComplex });
  const images = isComplex
    ? complex.data
      ? [...complex.data.heroImages, ...complex.data.renders, complex.data.masterPlan]
      : []
    : (property.data?.images ?? []);

  const lastIndex = Math.max(images.length - 1, 0);
  const requestedIndex = Math.max(Number(params.index ?? 0) || 0, 0);
  const initialIndex = Math.min(requestedIndex, lastIndex);
  const [rawIndex, setIndex] = useState(requestedIndex);
  // Фото могут подгрузиться позже (диплинк) — индекс ограничиваем по факту
  const index = Math.min(rawIndex, lastIndex);
  const [zoomed, setZoomed] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [hintVisible, setHintVisible] = useState(true);
  const dismissY = useSharedValue(0);
  const chrome = useSharedValue(1);

  useFocusedStatusBar('light');

  useEffect(() => {
    const timer = setTimeout(() => setHintVisible(false), motion.toast);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    chrome.set(withTiming(chromeVisible ? 1 : 0, { duration: motion.fast }));
  }, [chrome, chromeVisible]);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next === index) return;
    setIndex(next);
    if (!isComplex) analytics.track('gallery_swiped', { propertyId: id, index: next });
  };

  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(dismissY.get()), [0, layout.dismissDistance * 2], [1, BACKGROUND_MIN_OPACITY], 'clamp'),
  }));
  const chromeStyle = useAnimatedStyle(() => ({
    opacity: chrome.get() * interpolate(Math.abs(dismissY.get()), [0, layout.dismissDistance], [1, 0], 'clamp'),
  }));

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.background, backgroundStyle]} />

      {images.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} />
        </View>
      ) : (
        <FlatList
          data={images}
          keyExtractor={(uri, i) => `${uri}_${i}`}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={onMomentumEnd}
          windowSize={3}
          initialNumToRender={1}
          renderItem={({ item, index: i }) => (
            <ZoomableImage
              uri={item}
              width={width}
              height={height}
              active={i === index}
              dismissY={dismissY}
              onZoomChange={setZoomed}
              onDismiss={close}
              onTap={() => setChromeVisible((v) => !v)}
            />
          )}
        />
      )}

      <Animated.View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }, chromeStyle]} pointerEvents={chromeVisible ? 'box-none' : 'none'}>
        <IconButton icon="close" variant="glass" onPress={close} accessibilityLabel={t('common.close')} />
        {images.length > 1 ? (
          <View style={styles.counter}>
            <Text variant="buttonSm" color="white">
              {t('property.photoCounter', { current: index + 1, total: images.length })}
            </Text>
          </View>
        ) : null}
        <View style={styles.spacer} />
      </Animated.View>

      {hintVisible && images.length > 0 ? (
        <Animated.View exiting={FadeOut.duration(motion.slow)} style={[styles.hint, { bottom: insets.bottom + spacing.xl }]} pointerEvents="none">
          <Text variant="caption" color="white" align="center">
            {t('gallery.zoomHint')}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    flex: 1,
  },
  background: {
    backgroundColor: t.colors.black,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  counter: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + spacing.xxs,
    borderRadius: radii.pill,
    backgroundColor: t.colors.glassOnImage,
  },
  spacer: {
    width: sizes.iconButton.md,
  },
  hint: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: t.colors.glassOnImage,
    opacity: opacity.glass,
  },
}));
