import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Icon, PressableScale, Skeleton, Text } from '@/components/ui';
import { formatUSD } from '@/lib/format';
import { layout, makeStyles, motion, radii, sizes, spacing, useTheme } from '@/theme';
import type { Hotel } from '@/types/domain';

const IMAGE_ASPECT = layout.cardImageAspect;

/** «★★★★★» по числу звёзд отеля */
export function starsLabel(stars: number): string {
  return '★'.repeat(stars);
}

/** Бейдж «3D-тур» поверх фото */
export function TourBadge() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={styles.badge}>
      <Icon name="cube-outline" size="xs" color={colors.textOnGold} />
      <Text variant="micro" style={{ color: colors.textOnGold }}>
        {t('hotels.badge3d')}
      </Text>
    </View>
  );
}

/** Карточка отеля: фото с бейджем 3D, название · ★ · район · от $X / ночь. */
export function HotelCard({ hotel, width }: { hotel: Hotel; width?: number }) {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const imageHeight = width ? Math.round(width / IMAGE_ASPECT) : undefined;

  return (
    <PressableScale
      onPress={() => router.push({ pathname: '/hotel/[id]', params: { id: hotel.id } })}
      haptic="light"
      style={[styles.card, width ? { width } : null]}
      accessibilityRole="button"
      accessibilityLabel={`${hotel.name}, ${t('hotels.perNightFrom', { price: formatUSD(hotel.priceFrom) })}`}
    >
      <View>
        <Image
          source={{ uri: hotel.images[0] }}
          style={[styles.image, imageHeight ? { height: imageHeight } : { aspectRatio: IMAGE_ASPECT }]}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={motion.fast}
          recyclingKey={`hotel_${hotel.id}`}
        />
        <View style={styles.badgeWrap}>
          <TourBadge />
        </View>
      </View>
      <View style={styles.body}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {hotel.name}
        </Text>
        <View style={styles.metaRow}>
          <Text variant="caption" color="gold">
            {starsLabel(hotel.stars)}
          </Text>
          <Text variant="caption" color="tertiary">
            ·
          </Text>
          <Icon name="location-outline" size="xs" color={colors.textTertiary} />
          <Text variant="caption" color="secondary" numberOfLines={1} style={styles.flex}>
            {t(`districts.${hotel.district}`)}
          </Text>
        </View>
        <Text variant="price">{t('hotels.perNightFrom', { price: formatUSD(hotel.priceFrom) })}</Text>
      </View>
    </PressableScale>
  );
}

export function HotelCardSkeleton({ width }: { width?: number }) {
  const styles = useStyles();
  return (
    <View style={[styles.card, width ? { width } : null]}>
      <Skeleton width="100%" height={width ? Math.round(width / IMAGE_ASPECT) : sizes.avatar.xl * 2} radius={radii.none} />
      <View style={styles.body}>
        <Skeleton width="70%" height={spacing.lg} />
        <Skeleton width="50%" height={spacing.md} />
        <Skeleton width="40%" height={spacing.xl} />
      </View>
    </View>
  );
}

/** Плашка «Демо-версия: отели, цены и телефоны — примеры». */
export function HotelsDemoNote() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={styles.demo}>
      <Icon name="information-circle-outline" size="sm" color={colors.warning} />
      <Text variant="caption" color="secondary" style={styles.flex}>
        {t('hotels.demoNote')}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  flex: {
    flex: 1,
  },
  card: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  image: {
    width: '100%',
    backgroundColor: t.colors.skeleton,
  },
  badgeWrap: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    backgroundColor: t.colors.gold,
  },
  body: {
    padding: spacing.md,
    gap: spacing.xxs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  demo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: t.colors.warningSoft,
  },
}));
