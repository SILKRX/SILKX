import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { interpolate, type SharedValue, useAnimatedReaction, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Icon, IconButton, type IconName, Logo, PressableScale, Text } from '@/components/ui';
import { useUnreadCounts } from '@/hooks/api/engagement';
import { useFocusedStatusBar } from '@/hooks/useStatusBar';
import { analytics } from '@/lib/analytics';
import { useFiltersStore } from '@/store/filters';
import { useIsSignedIn } from '@/store/session';
import { effects, elevation, layout, makeStyles, opacity, radii, sizes, spacing, useTheme } from '@/theme';

type GreetingKey = 'home.greetingMorning' | 'home.greetingDay' | 'home.greetingEvening' | 'home.greetingNight';

const MORNING_FROM = 5;
const DAY_FROM = 12;
const EVENING_FROM = 18;
const NIGHT_FROM = 23;

export function greetingKey(date = new Date()): GreetingKey {
  const hour = date.getHours();
  if (hour >= MORNING_FROM && hour < DAY_FROM) return 'home.greetingMorning';
  if (hour >= DAY_FROM && hour < EVENING_FROM) return 'home.greetingDay';
  if (hour >= EVENING_FROM && hour < NIGHT_FROM) return 'home.greetingEvening';
  return 'home.greetingNight';
}

/** Стеклянная подложка поверх фото: blur на iOS, полупрозрачный графит на Android и вебе. */
function GlassFill() {
  const styles = useStyles();
  return (
    <>
      {Platform.OS === 'ios' ? <BlurView intensity={effects.blur} tint="dark" style={StyleSheet.absoluteFill} /> : null}
      <View style={[StyleSheet.absoluteFill, styles.glassTint]} />
    </>
  );
}

/** Крупная строка поиска поверх hero: ведёт в каталог и сразу фокусирует поле. */
export function HeroSearchBar() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={() => router.push({ pathname: '/catalog', params: { focus: '1' } })}
      haptic="light"
      style={styles.search}
      accessibilityRole="search"
      accessibilityLabel={t('home.searchPlaceholder')}
    >
      <GlassFill />
      <Icon name="search" size="lg" color={colors.white} />
      <Text color="white" style={styles.searchText} numberOfLines={1}>
        {t('home.searchPlaceholder')}
      </Text>
      <View style={styles.searchFilter}>
        <Icon name="options-outline" size="md" color={colors.textOnGold} />
      </View>
    </PressableScale>
  );
}

interface QuickAction {
  key: string;
  label: string;
  icon: IconName;
  onPress: () => void;
}

export function QuickActions() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const setFilters = useFiltersStore((s) => s.setFilters);

  const actions: QuickAction[] = [
    {
      key: 'sale',
      label: t('home.quickSale'),
      icon: 'key-outline',
      onPress: () => {
        setFilters({ dealType: 'sale' });
        router.push({ pathname: '/catalog', params: { view: 'list' } });
      },
    },
    {
      key: 'rent',
      label: t('home.quickRent'),
      icon: 'bed-outline',
      onPress: () => {
        setFilters({ dealType: 'rent' });
        router.push({ pathname: '/catalog', params: { view: 'list' } });
      },
    },
    {
      key: 'complexes',
      label: t('home.quickComplexes'),
      icon: 'business-outline',
      onPress: () => {
        setFilters({ dealType: 'sale' });
        router.push({ pathname: '/catalog', params: { view: 'list', section: 'complexes' } });
      },
    },
    {
      key: 'map',
      label: t('home.quickMap'),
      icon: 'map-outline',
      onPress: () => {
        analytics.track('catalog_view_mode', { mode: 'map' });
        router.push({ pathname: '/catalog', params: { view: 'map' } });
      },
    },
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll} contentContainerStyle={styles.quickRow}>
      {actions.map((a) => (
        <PressableScale
          key={a.key}
          onPress={a.onPress}
          haptic="selection"
          style={styles.quick}
          accessibilityRole="button"
          accessibilityLabel={a.label}
        >
          <GlassFill />
          <Icon name={a.icon} size="sm" color={colors.gold} />
          <Text variant="buttonSm" color="white">
            {a.label}
          </Text>
        </PressableScale>
      ))}
    </ScrollView>
  );
}

/**
 * Шапка главной: прозрачная над фото, при скролле проявляется фон темы.
 * Цвет статус-бара переключается в момент, когда шапка становится непрозрачной.
 */
export function HomeTopBar({ scrollY, heroHeight }: { scrollY: SharedValue<number>; heroHeight: number }) {
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const signedIn = useIsSignedIn();
  const unread = useUnreadCounts();
  const [solid, setSolid] = useState(false);

  const fadeStart = heroHeight * layout.heroFadeStartRatio;
  const fadeEnd = Math.max(fadeStart + spacing.lg, heroHeight - insets.top - sizes.header);
  const fadeMid = (fadeStart + fadeEnd) / 2;

  useFocusedStatusBar(solid ? null : 'light');

  useAnimatedReaction(
    () => scrollY.get() > fadeMid,
    (passed, previous) => {
      if (passed !== previous) scheduleOnRN(setSolid, passed);
    },
  );

  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [fadeStart, fadeEnd], [0, 1], 'clamp'),
  }));
  const onDarkLogoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [fadeStart, fadeEnd], [1, 0], 'clamp'),
  }));
  const themedLogoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [fadeStart, fadeEnd], [0, 1], 'clamp'),
  }));

  const go = (path: '/chats' | '/notifications') => {
    if (!signedIn) {
      router.push({ pathname: '/sign-in', params: { redirect: path } });
      return;
    }
    router.push(path);
  };

  return (
    <View style={[styles.topBar, { paddingTop: insets.top }]} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, styles.topBarBg, backgroundStyle]} pointerEvents="none" />
      <View style={styles.topBarRow} pointerEvents="box-none">
        <View pointerEvents="none">
          <Animated.View style={onDarkLogoStyle}>
            <Logo height={sizes.logo.sm} onDark />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, themedLogoStyle]}>
            <Logo height={sizes.logo.sm} />
          </Animated.View>
        </View>
        <View style={styles.topBarActions}>
          <IconButton
            icon="chatbubble-ellipses-outline"
            variant={solid ? 'surface' : 'glass'}
            badge={unread.messages}
            onPress={() => go('/chats')}
            accessibilityLabel={t('profile.messages')}
          />
          <IconButton
            icon="notifications-outline"
            variant={solid ? 'surface' : 'glass'}
            badge={unread.notifications}
            onPress={() => go('/notifications')}
            accessibilityLabel={t('notifications.title')}
          />
        </View>
      </View>
    </View>
  );
}

export function WhySilkx() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const items: { icon: IconName; title: string; text: string }[] = [
    { icon: 'pricetag-outline', title: t('home.why1Title'), text: t('home.why1Text') },
    { icon: 'shield-checkmark-outline', title: t('home.why2Title'), text: t('home.why2Text') },
    { icon: 'calendar-outline', title: t('home.why3Title'), text: t('home.why3Text') },
  ];
  return (
    <View style={styles.why}>
      <Text variant="h2" style={styles.whyTitle}>
        {t('home.whyTitle')}
      </Text>
      {items.map((item) => (
        <View key={item.title} style={styles.whyItem}>
          <View style={styles.whyIcon}>
            <Icon name={item.icon} size="lg" color={colors.gold} />
          </View>
          <View style={styles.whyTexts}>
            <Text variant="title">{item.title}</Text>
            <Text variant="bodySm" color="secondary">
              {item.text}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  glassTint: {
    backgroundColor: t.colors.glassOnImage,
  },
  search: {
    height: sizes.input + spacing.sm,
    borderRadius: radii.xl,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    borderWidth: sizes.border,
    borderColor: t.colors.glassBorder,
  },
  searchText: {
    flex: 1,
    opacity: opacity.pressed,
  },
  searchFilter: {
    width: sizes.iconButton.md,
    height: sizes.iconButton.md,
    borderRadius: radii.lg,
    backgroundColor: t.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickScroll: {
    // горизонтальный ScrollView по умолчанию растягивается по вертикали (flexGrow: 1)
    flexGrow: 0,
  },
  quickRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  quick: {
    height: sizes.chip + spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + spacing.xxs,
    borderWidth: sizes.border,
    borderColor: t.colors.glassBorder,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBarBg: {
    backgroundColor: t.colors.background,
    borderBottomWidth: sizes.border,
    borderBottomColor: t.colors.border,
  },
  topBarRow: {
    height: sizes.header,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  topBarActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  why: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xxxl,
    padding: spacing.xl,
    borderRadius: radii.xl,
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
    gap: spacing.lg,
    ...elevation.card,
  },
  whyTitle: {
    marginBottom: spacing.xs,
  },
  whyItem: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  whyIcon: {
    width: sizes.iconButton.lg,
    height: sizes.iconButton.lg,
    borderRadius: radii.md,
    backgroundColor: t.colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whyTexts: {
    flex: 1,
    gap: spacing.xxs,
  },
}));
