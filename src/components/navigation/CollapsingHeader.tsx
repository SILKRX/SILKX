import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, type SharedValue, useAnimatedReaction, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { IconButton, Text } from '@/components/ui';
import { useFocusedStatusBar } from '@/hooks/useStatusBar';
import { makeStyles, sizes, spacing } from '@/theme';

/** На какой доле пути до threshold шапка начинает проявляться */
const FADE_START_RATIO = 0.6;

interface CollapsingHeaderProps {
  scrollY: SharedValue<number>;
  /** Смещение скролла, после которого шапка полностью непрозрачна */
  threshold: number;
  title?: string;
  /** Кнопки справа; solid — шапка уже непрозрачная (меняем «стекло» на обычные кнопки) */
  right?: (solid: boolean) => ReactNode;
  onBack?: () => void;
}

/**
 * Шапка поверх фото: прозрачная со «стеклянными» кнопками, при скролле
 * проявляется фон темы и заголовок. Цвет статус-бара переключается синхронно.
 */
export function CollapsingHeader({ scrollY, threshold, title, right, onBack }: CollapsingHeaderProps) {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [solid, setSolid] = useState(false);
  const start = threshold * FADE_START_RATIO;

  useFocusedStatusBar(solid ? null : 'light');

  useAnimatedReaction(
    () => scrollY.get() > (start + threshold) / 2,
    (passed, previous) => {
      if (passed !== previous) scheduleOnRN(setSolid, passed);
    },
  );

  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [start, threshold], [0, 1], 'clamp'),
  }));

  const handleBack = () => {
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, styles.background, backgroundStyle]} pointerEvents="none" />
      <View style={styles.row} pointerEvents="box-none">
        <IconButton icon="chevron-back" variant={solid ? 'ghost' : 'glass'} onPress={handleBack} accessibilityLabel={t('common.back')} />
        <Animated.View style={[styles.titleBox, backgroundStyle]} pointerEvents="none">
          {title ? (
            <Text variant="title" numberOfLines={1} align="center">
              {title}
            </Text>
          ) : null}
        </Animated.View>
        <View style={styles.right}>{right?.(solid)}</View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  background: {
    backgroundColor: t.colors.background,
    borderBottomWidth: sizes.border,
    borderBottomColor: t.colors.border,
  },
  row: {
    height: sizes.header,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  titleBox: {
    flex: 1,
  },
  right: {
    flexDirection: 'row',
    gap: spacing.sm,
    minWidth: sizes.iconButton.md,
    justifyContent: 'flex-end',
  },
}));
