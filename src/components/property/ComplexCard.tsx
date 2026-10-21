import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Badge, PressableScale, Skeleton, Text } from '@/components/ui';
import { formatMonthYear, formatUSD } from '@/lib/format';
import { elevation, gradients, layout, makeStyles, motion, opacity, radii, spacing } from '@/theme';
import type { Complex } from '@/types/domain';

/** Карточка ЖК для «Премиум новостроек» и подраздела застройщиков в каталоге. */
export function ComplexCard({ complex, width }: { complex: Complex; width: number }) {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const height = Math.round(width / layout.wideImageAspect);
  const available = complex.units.filter((u) => u.status === 'available').length;
  const cover = complex.heroImages[0];

  return (
    <PressableScale
      onPress={() => router.push({ pathname: '/complex/[id]', params: { id: complex.id } })}
      scaleTo={motion.pressScaleSubtle}
      style={[styles.card, { width, height }]}
      accessibilityRole="button"
      accessibilityLabel={complex.name}
    >
      {cover ? <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={motion.base} /> : null}
      <LinearGradient colors={gradients.cardBottom} style={StyleSheet.absoluteFill} />
      <View style={styles.top}>
        <Badge tone="gold" icon="sparkles" label={t(`complex.class.${complex.class}`)} />
        <Badge tone="glass" icon="key-outline" label={t('complex.available', { count: available })} />
      </View>
      <View style={styles.bottom}>
        <Text variant="h2" color="white" numberOfLines={1}>
          {complex.name}
        </Text>
        <Text variant="bodySm" color="white" style={styles.muted} numberOfLines={1}>
          {complex.developer.name} · {t(`districts.${complex.district}`)}
        </Text>
        <View style={styles.row}>
          <Text variant="title" color="white">
            {t('complex.from', { price: formatUSD(complex.priceFrom) })}
          </Text>
          <Text variant="caption" color="white" style={styles.muted}>
            {t('complex.completion', { date: formatMonthYear(new Date(complex.completion), t) })}
          </Text>
        </View>
      </View>
    </PressableScale>
  );
}

export function ComplexCardSkeleton({ width }: { width: number }) {
  return <Skeleton width={width} height={Math.round(width / layout.wideImageAspect)} radius={radii.xl} />;
}

const useStyles = makeStyles((t) => ({
  card: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    justifyContent: 'space-between',
    backgroundColor: t.colors.skeleton,
    ...elevation.card,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  bottom: {
    padding: spacing.lg,
    gap: spacing.xxs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  muted: {
    opacity: opacity.pressed,
  },
}));
