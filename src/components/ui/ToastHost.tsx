import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeOutUp, LinearTransition, SlideInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type ToastItem, type ToastType, useToastStore } from '@/store/toast';
import { elevation, makeStyles, radii, sizes, spacing, type ThemeColors, useTheme, zIndex } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

const TOAST_ICON: Record<ToastType, { icon: IconName; color: keyof ThemeColors }> = {
  success: { icon: 'checkmark-circle', color: 'success' },
  error: { icon: 'close-circle', color: 'danger' },
  warning: { icon: 'warning', color: 'warning' },
  info: { icon: 'information-circle', color: 'gold' },
  offline: { icon: 'cloud-offline', color: 'warning' },
};

function ToastView({ toast }: { toast: ToastItem }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const hide = useToastStore((s) => s.hide);
  const meta = TOAST_ICON[toast.type];

  useEffect(() => {
    if (toast.duration === null) return;
    const timer = setTimeout(() => hide(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [hide, toast.duration, toast.id]);

  return (
    <Animated.View entering={SlideInUp.springify().damping(18)} exiting={FadeOutUp.duration(180)} layout={LinearTransition}>
      <Pressable
        onPress={() => hide(toast.id)}
        style={styles.toast}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        <Icon name={meta.icon} size="lg" color={colors[meta.color]} />
        <View style={styles.texts}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {toast.title}
          </Text>
          {toast.message ? (
            <Text variant="bodySm" color="secondary" numberOfLines={3}>
              {toast.message}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Глобальный слой тостов вместо системных Alert. */
export function ToastHost() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const toasts = useToastStore((s) => s.toasts);
  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + spacing.sm }]}>
      {toasts.map((toast) => (
        <ToastView key={toast.id} toast={toast} />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  host: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: zIndex.toast,
    gap: spacing.sm,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: t.colors.surfaceElevated,
    borderWidth: sizes.border,
    borderColor: t.colors.borderStrong,
    ...elevation.floating,
  },
  texts: {
    flex: 1,
    gap: spacing.xxs,
  },
}));
