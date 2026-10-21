import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, useWindowDimensions, View } from 'react-native';

import { Icon, type IconName, Text } from '@/components/ui';
import { floorLabel, propertyTypeLabel, renovationLabel } from '@/features/property/format';
import { formatArea } from '@/lib/format';
import { layout, makeStyles, radii, sizes, spacing, useTheme } from '@/theme';
import type { AmenityId, InfrastructureItem, Property } from '@/types/domain';

export const AMENITY_ICONS: Record<AmenityId, IconName> = {
  wifi: 'wifi',
  parking: 'car-outline',
  security: 'shield-checkmark-outline',
  panoramic: 'expand-outline',
  elevator: 'swap-vertical-outline',
  conditioner: 'snow-outline',
  furniture: 'bed-outline',
  appliances: 'tv-outline',
  playground: 'happy-outline',
  gym: 'barbell-outline',
  concierge: 'person-circle-outline',
  balcony: 'sunny-outline',
};

export const INFRASTRUCTURE_ICONS: Record<InfrastructureItem, IconName> = {
  school: 'school-outline',
  kindergarten: 'balloon-outline',
  parking: 'car-outline',
  security: 'shield-checkmark-outline',
  park: 'leaf-outline',
  fitness: 'barbell-outline',
  shop: 'bag-handle-outline',
  metro: 'train-outline',
};

const GRID_COLUMNS = 2;

/** Ширина плитки в сетке из двух колонок с учётом отступов экрана. */
function useTileWidth(): number {
  const { width } = useWindowDimensions();
  const content = Math.min(width, layout.maxContentWidth) - layout.screenPadding * 2;
  return (content - spacing.md * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
}

interface SpecTile {
  key: string;
  icon: IconName;
  label: string;
  value: string;
}

/** Ключевые характеристики плитками: комнаты, площадь, этаж, ремонт, тип, сдача. */
export function SpecsGrid({ property }: { property: Property }) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tileWidth = useTileWidth();

  const tiles: SpecTile[] = [
    {
      key: 'rooms',
      icon: 'bed-outline',
      label: t('property.specRooms'),
      value: property.rooms === 0 ? t('rooms.studio') : String(property.rooms),
    },
    { key: 'area', icon: 'resize-outline', label: t('property.specArea'), value: `${formatArea(property.area)} ${t('units.sqm')}` },
  ];
  if (property.type !== 'house') {
    tiles.push({ key: 'floor', icon: 'layers-outline', label: t('property.specFloor'), value: floorLabel(property, t) });
  }
  tiles.push({ key: 'renovation', icon: 'color-palette-outline', label: t('property.specRenovation'), value: renovationLabel(property.renovation, t) });
  tiles.push({ key: 'type', icon: 'home-outline', label: t('property.specType'), value: propertyTypeLabel(property.type, t) });
  if (property.completionYear) {
    tiles.push({ key: 'completion', icon: 'calendar-outline', label: t('property.specCompletion'), value: String(property.completionYear) });
  }

  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <View key={tile.key} style={[styles.tile, { width: tileWidth }]}>
          <Icon name={tile.icon} size="md" color={colors.gold} />
          <Text variant="caption" color="secondary">
            {tile.label}
          </Text>
          <Text variant="bodyStrong" numberOfLines={1}>
            {tile.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Сетка удобств/инфраструктуры: иконка + подпись в две колонки. */
export function FeatureGrid({ items }: { items: readonly { key: string; icon: IconName; label: string }[] }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const tileWidth = useTileWidth();
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View key={item.key} style={[styles.feature, { width: tileWidth }]}>
          <View style={styles.featureIcon}>
            <Icon name={item.icon} size="sm" color={colors.gold} />
          </View>
          <Text variant="bodySm" style={styles.flex} numberOfLines={2}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function AmenitiesGrid({ amenities }: { amenities: readonly AmenityId[] }) {
  const { t } = useTranslation();
  return <FeatureGrid items={amenities.map((id) => ({ key: id, icon: AMENITY_ICONS[id], label: t(`amenities.${id}`) }))} />;
}

/**
 * Текст, свёрнутый до N строк, с кнопкой «Читать полностью».
 * Длину меряем скрытой копией — onTextLayout у обрезанного текста врёт на iOS.
 * В вебе onTextLayout не вызывается: показываем текст целиком.
 */
export function ExpandableText({ text, lines = layout.descriptionPreviewLines }: { text: string; lines?: number }) {
  const styles = useStyles();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [lineCount, setLineCount] = useState(0);
  const collapsible = lineCount > lines;

  return (
    <View>
      <Text style={styles.measure} onTextLayout={(e) => setLineCount(e.nativeEvent.lines.length)} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {text}
      </Text>
      <Text color="secondary" numberOfLines={collapsible && !expanded ? lines : undefined}>
        {text}
      </Text>
      {collapsible ? (
        <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={sizes.hitSlop} style={styles.more} accessibilityRole="button">
          <Text variant="buttonSm" color="gold">
            {expanded ? t('common.showLess') : t('common.showMore')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Заголовок блока на экране объекта/ЖК. */
export function DetailSection({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text variant="h3" style={styles.flex}>
          {title}
        </Text>
        {right}
      </View>
      {children}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  flex: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  tile: {
    padding: spacing.md,
    gap: spacing.xxs,
    borderRadius: radii.lg,
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: sizes.touch,
  },
  featureIcon: {
    width: sizes.iconButton.sm,
    height: sizes.iconButton.sm,
    borderRadius: radii.sm,
    backgroundColor: t.colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  measure: {
    position: 'absolute',
    left: 0,
    right: 0,
    opacity: 0,
  },
  more: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  section: {
    gap: spacing.md,
    paddingTop: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
}));
