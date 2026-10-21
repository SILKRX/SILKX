import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Icon, PressableScale, Skeleton, Text } from '@/components/ui';
import { floorLabel, perM2Label, priceLabel, propertyTitle } from '@/features/property/format';
import { analytics } from '@/lib/analytics';
import { formatArea } from '@/lib/format';
import { elevation, layout, makeStyles, motion, radii, sizes, spacing, useTheme } from '@/theme';
import type { Property } from '@/types/domain';

import { FavoriteButton } from './FavoriteButton';
import { PhotoPager } from './PhotoPager';
import { PropertyBadges } from './PropertyBadges';

const GALLERY_MILESTONE = 5;

interface PropertyCardProps {
  property: Property;
  width: number;
  source?: string;
}

/** Карточка каталога: листаемые фото прямо в списке, цена, район, комнаты и площадь, сердечко. */
export function PropertyCard({ property, width, source = 'catalog' }: PropertyCardProps) {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const imageHeight = Math.round(width / layout.cardImageAspect);
  const perM2 = perM2Label(property, t);

  const open = () => {
    analytics.track('property_viewed', { propertyId: property.id, source });
    router.push({ pathname: '/property/[id]', params: { id: property.id } });
  };

  return (
    <PressableScale
      onPress={open}
      scaleTo={motion.pressScaleSubtle}
      style={[styles.card, { width }, property.promotion === 'gold' && styles.goldFrame]}
      accessibilityRole="button"
      accessibilityLabel={`${propertyTitle(property, t)}, ${priceLabel(property, t)}`}
    >
      <View>
        <PhotoPager
          images={property.images}
          width={width}
          height={imageHeight}
          onPress={open}
          recyclingKey={property.id}
          onIndexChange={(index) => {
            analytics.track('gallery_swiped', { propertyId: property.id, index });
            if (index + 1 === GALLERY_MILESTONE) analytics.track('gallery_milestone', { propertyId: property.id, photosSeen: GALLERY_MILESTONE });
          }}
        />
        <View style={styles.topRow} pointerEvents="box-none">
          <PropertyBadges property={property} />
          <FavoriteButton propertyId={property.id} />
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.priceRow}>
          <Text variant="price" numberOfLines={1}>
            {priceLabel(property, t)}
          </Text>
          {perM2 ? (
            <Text variant="caption" color="secondary" numberOfLines={1}>
              {perM2}
            </Text>
          ) : null}
        </View>
        <Text variant="bodyStrong" numberOfLines={1}>
          {propertyTitle(property, t)}
        </Text>
        <View style={styles.locationRow}>
          <Icon name="location-outline" size="xs" color={colors.gold} />
          <Text variant="bodySm" color="secondary" numberOfLines={1} style={styles.flex}>
            {t(`districts.${property.district}`)} · {property.address}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Meta icon="bed-outline" label={property.rooms === 0 ? t('rooms.studio') : t('rooms.count', { count: property.rooms })} />
          <Meta icon="resize-outline" label={`${formatArea(property.area)} ${t('units.sqm')}`} />
          {property.type !== 'house' ? <Meta icon="layers-outline" label={floorLabel(property, t)} /> : null}
        </View>
      </View>
    </PressableScale>
  );
}

function Meta({ icon, label }: { icon: 'bed-outline' | 'resize-outline' | 'layers-outline'; label: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.meta}>
      <Icon name={icon} size="sm" color={colors.textTertiary} />
      <Text variant="caption" color="secondary" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Компактная карточка для каруселей и карты. */
export function PropertyCardCompact({ property, width, horizontal = false, source = 'carousel' }: { property: Property; width: number; horizontal?: boolean; source?: string }) {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const open = () => {
    analytics.track('property_viewed', { propertyId: property.id, source });
    router.push({ pathname: '/property/[id]', params: { id: property.id } });
  };
  const cover = property.images[0];

  if (horizontal) {
    return (
      <PressableScale onPress={open} scaleTo={motion.pressScaleSubtle} style={[styles.hCard, { width }]} accessibilityRole="button">
        {cover ? (
          <Image source={{ uri: cover }} style={styles.hImage} contentFit="cover" cachePolicy="memory-disk" transition={motion.fast} recyclingKey={property.id} />
        ) : (
          <View style={styles.hImage} />
        )}
        <View style={styles.hBody}>
          <Text variant="title" numberOfLines={1}>
            {priceLabel(property, t)}
          </Text>
          <Text variant="bodySm" numberOfLines={1}>
            {propertyTitle(property, t)}
          </Text>
          <View style={styles.locationRow}>
            <Icon name="location-outline" size="xs" color={colors.gold} />
            <Text variant="caption" color="secondary" numberOfLines={1} style={styles.flex}>
              {t(`districts.${property.district}`)}
            </Text>
          </View>
        </View>
        <View style={styles.hFavorite}>
          <FavoriteButton propertyId={property.id} size="sm" variant="surface" />
        </View>
      </PressableScale>
    );
  }

  const imageHeight = Math.round(width / layout.cardImageAspect);
  return (
    <PressableScale onPress={open} scaleTo={motion.pressScaleSubtle} style={[styles.card, { width }, property.promotion === 'gold' && styles.goldFrame]} accessibilityRole="button">
      <View>
        {cover ? (
          <Image source={{ uri: cover }} style={{ width, height: imageHeight }} contentFit="cover" cachePolicy="memory-disk" transition={motion.base} recyclingKey={property.id} />
        ) : (
          <View style={{ width, height: imageHeight }} />
        )}
        <View style={styles.topRow} pointerEvents="box-none">
          <PropertyBadges property={property} max={1} />
          <FavoriteButton propertyId={property.id} size="sm" />
        </View>
      </View>
      <View style={styles.bodyCompact}>
        <Text variant="title" numberOfLines={1}>
          {priceLabel(property, t)}
        </Text>
        <Text variant="bodySm" numberOfLines={1}>
          {propertyTitle(property, t)}
        </Text>
        <Text variant="caption" color="secondary" numberOfLines={1}>
          {t(`districts.${property.district}`)}
        </Text>
      </View>
    </PressableScale>
  );
}

export function PropertyCardSkeleton({ width, compact = false }: { width: number; compact?: boolean }) {
  const styles = useStyles();
  const imageHeight = Math.round(width / layout.cardImageAspect);
  return (
    <View style={[styles.card, { width }]}>
      <Skeleton width={width} height={imageHeight} radius={radii.none} />
      <View style={compact ? styles.bodyCompact : styles.body}>
        <Skeleton width="45%" height={spacing.xxl} />
        <Skeleton width="80%" height={spacing.lg} />
        <Skeleton width="60%" height={spacing.md} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  flex: {
    flex: 1,
  },
  card: {
    borderRadius: radii.xl,
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
    overflow: 'hidden',
    ...elevation.card,
  },
  goldFrame: {
    borderColor: t.colors.gold,
    borderWidth: sizes.borderStrong,
  },
  topRow: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.xs + spacing.xxs,
  },
  bodyCompact: {
    padding: spacing.md,
    gap: spacing.xxs + spacing.xxs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  hCard: {
    height: layout.mapCardHeight,
    flexDirection: 'row',
    borderRadius: radii.xl,
    backgroundColor: t.colors.surfaceElevated,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
    overflow: 'hidden',
    ...elevation.floating,
  },
  hImage: {
    width: layout.mapCardHeight,
    height: layout.mapCardHeight,
    backgroundColor: t.colors.skeleton,
  },
  hBody: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xxs,
    justifyContent: 'center',
  },
  hFavorite: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
}));
