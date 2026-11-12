import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { BlurView } from 'expo-blur';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Icon, type IconName, Text } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { effects, makeStyles, motion, radii, sizes, spacing, typography, useTheme } from '@/theme';

const TAB_ICONS: Record<string, { active: IconName; inactive: IconName }> = {
  index: { active: 'home', inactive: 'home-outline' },
  catalog: { active: 'compass', inactive: 'compass-outline' },
  hotels: { active: 'bed', inactive: 'bed-outline' },
  favorites: { active: 'heart', inactive: 'heart-outline' },
  manage: { active: 'shield-checkmark', inactive: 'shield-checkmark-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
};

const FALLBACK_ICON = { active: 'ellipse', inactive: 'ellipse-outline' } as const satisfies { active: IconName; inactive: IconName };
const ACTIVE_ICON_SCALE = 1.12;

function TabItem({
  label,
  focused,
  icons,
  badge,
  onPress,
  onLongPress,
}: {
  label: string;
  focused: boolean;
  icons: { active: IconName; inactive: IconName };
  badge: number;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.set(withSpring(focused ? 1 : 0, motion.spring));
  }, [focused, progress]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + progress.get() * (ACTIVE_ICON_SCALE - 1) }] }));
  const indicatorStyle = useAnimatedStyle(() => ({ opacity: progress.get(), transform: [{ scaleX: progress.get() }] }));
  const color = focused ? colors.gold : colors.tabInactive;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.item}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.indicator, indicatorStyle]} />
      <Animated.View style={iconStyle}>
        <Icon name={focused ? icons.active : icons.inactive} size="lg" color={color} />
        {badge > 0 ? <View style={styles.badgeDot} /> : null}
      </Animated.View>
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

interface AppTabBarProps extends BottomTabBarProps {
  badges?: Partial<Record<string, number>>;
}

/** Нижняя панель табов SILKX: золотой индикатор, haptic-отклик, скрытие табов по роли. */
export function AppTabBar({ state, descriptors, emitter, navigateToTab, insets, badges = {} }: AppTabBarProps) {
  const styles = useStyles();
  const { isDark } = useTheme();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={effects.blurStrong} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      ) : null}
      <View style={[StyleSheet.absoluteFill, styles.background]} />
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const descriptor = descriptors[route.key];
          if (!descriptor) return null;
          const { options } = descriptor;
          if (options.hidden) return null;
          const focused = index === state.index;
          const label = typeof options.title === 'string' ? options.title : route.name;
          return (
            <TabItem
              key={route.key}
              label={label}
              focused={focused}
              icons={TAB_ICONS[route.name] ?? FALLBACK_ICON}
              badge={badges[route.name] ?? 0}
              onPress={() => {
                const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  haptics.selection();
                  navigateToTab(route.key);
                }
              }}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
            />
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  bar: {
    borderTopWidth: sizes.border,
    borderTopColor: t.colors.tabBarBorder,
    overflow: 'hidden',
  },
  background: {
    backgroundColor: t.colors.tabBar,
  },
  row: {
    flexDirection: 'row',
    height: sizes.tabBar,
    alignItems: 'center',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    paddingTop: spacing.xs,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: spacing.xxl,
    height: sizes.progress - 1,
    borderBottomLeftRadius: radii.xs,
    borderBottomRightRadius: radii.xs,
    backgroundColor: t.colors.gold,
  },
  label: {
    ...typography.tab,
  },
  badgeDot: {
    position: 'absolute',
    top: -spacing.xxs,
    right: -spacing.xs,
    width: sizes.badgeDot,
    height: sizes.badgeDot,
    borderRadius: radii.pill,
    backgroundColor: t.colors.gold,
    borderWidth: sizes.border,
    borderColor: t.colors.background,
  },
}));
