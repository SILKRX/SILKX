import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { type StyleProp, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { gradients, makeStyles, motion, radii, sizes, spacing, typography, useTheme } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

const wordmarkLight = require('../../../assets/images/logo-wordmark.png') as number;
const wordmarkInk = require('../../../assets/images/logo-wordmark-ink.png') as number;
const mark = require('../../../assets/images/logo-mark.png') as number;

const WORDMARK_RATIO = 1196 / 400;
const INITIALS_SCALE = 0.36;
const INITIALS_LINE_SCALE = 0.44;

/** Логотип SILKX: на тёмном фоне — белые буквы, на светлом — графитовые. Золотой «X» всегда. */
export function Logo({ height = sizes.logo.md, onDark, style }: { height?: number; onDark?: boolean; style?: StyleProp<ViewStyle> }) {
  const { isDark } = useTheme();
  const useLight = onDark ?? isDark;
  return (
    <View style={style} accessibilityRole="image" accessibilityLabel="SILKX">
      <Image
        source={useLight ? wordmarkLight : wordmarkInk}
        style={{ height, width: height * WORDMARK_RATIO }}
        contentFit="contain"
        cachePolicy="memory"
      />
    </View>
  );
}

export function LogoMark({ size = sizes.mark }: { size?: number }) {
  return <Image source={mark} style={{ width: size, height: size }} contentFit="contain" cachePolicy="memory" accessibilityLabel="SILKX" />;
}

interface AvatarProps {
  name: string;
  uri?: string | null;
  size?: keyof typeof sizes.avatar;
  online?: boolean;
  verified?: boolean;
}

export function Avatar({ name, uri, size = 'md', online, verified }: AvatarProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const px = sizes.avatar[size];
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <View style={{ width: px, height: px }}>
      {uri ? (
        <Image source={{ uri }} style={[styles.avatar, { width: px, height: px, borderRadius: px / 2 }]} contentFit="cover" cachePolicy="memory-disk" />
      ) : (
        <LinearGradient
          colors={gradients.goldSoft}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.avatar, { width: px, height: px, borderRadius: px / 2 }]}
        >
          <Text style={[styles.initials, { fontSize: px * INITIALS_SCALE, lineHeight: px * INITIALS_LINE_SCALE }]}>{initials || 'S'}</Text>
        </LinearGradient>
      )}
      {online ? <View style={[styles.online, { borderColor: colors.background }]} /> : null}
      {verified ? (
        <View style={styles.verified}>
          <Icon name="checkmark" size={sizes.icon.xs - spacing.xxs} color={colors.textOnGold} />
        </View>
      ) : null}
    </View>
  );
}

export function Stars({ rating, size = 'xs' }: { rating: number; size?: 'xs' | 'sm' }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.stars} accessibilityLabel={`${rating.toFixed(1)} / 5`}>
      {Array.from({ length: 5 }, (_, i) => {
        const filled = rating >= i + 0.75;
        const half = !filled && rating >= i + 0.25;
        return <Icon key={i} name={filled ? 'star' : half ? 'star-half' : 'star-outline'} size={size} color={colors.gold} />;
      })}
    </View>
  );
}

export function ProgressBar({ progress }: { progress: number }) {
  const styles = useStyles();
  const fillStyle = useAnimatedStyle(() => ({
    width: withTiming(`${Math.min(Math.max(progress, 0), 1) * 100}%`, { duration: motion.base }),
  }));
  return (
    <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}>
      <Animated.View style={[styles.progressFill, fillStyle]} />
    </View>
  );
}

export function StatusDot({ color }: { color: string }) {
  const styles = useStyles();
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

const useStyles = makeStyles((t) => ({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontFamily: typography.bodyStrong.fontFamily,
    color: t.colors.textOnGold,
  },
  online: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: sizes.statusDot + spacing.xxs,
    height: sizes.statusDot + spacing.xxs,
    borderRadius: radii.pill,
    borderWidth: sizes.borderStrong,
    backgroundColor: t.colors.online,
  },
  verified: {
    position: 'absolute',
    right: -spacing.xxs,
    bottom: -spacing.xxs,
    width: spacing.lg,
    height: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: t.colors.gold,
    borderWidth: sizes.borderStrong,
    borderColor: t.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stars: {
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  progressTrack: {
    height: sizes.progress,
    borderRadius: radii.pill,
    backgroundColor: t.colors.surfacePressed,
    overflow: 'hidden',
  },
  progressFill: {
    height: sizes.progress,
    borderRadius: radii.pill,
    backgroundColor: t.colors.gold,
  },
  dot: {
    width: sizes.badgeDot,
    height: sizes.badgeDot,
    borderRadius: radii.pill,
  },
}));
