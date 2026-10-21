import { View } from 'react-native';

import { Text } from '@/components/ui';
import { formatCompactUSD } from '@/lib/format';
import { makeStyles, motion, radii, sizes, spacing, typography } from '@/theme';
import type { Property } from '@/types/domain';

/** Подпись маркера: компактная цена ($85K, $1.2M, $650). */
export function markerLabel(property: Pick<Property, 'price'>): string {
  return formatCompactUSD(property.price);
}

/** «Пузырь» с ценой и хвостиком — общий для нативной карты и веб-схемы. */
export function PriceMarker({ label, selected }: { label: string; selected: boolean }) {
  const styles = useStyles();
  return (
    <View style={[styles.wrap, selected && styles.wrapSelected]}>
      <View style={[styles.bubble, selected && styles.bubbleSelected]}>
        <Text style={[styles.text, selected && styles.textSelected]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={[styles.arrow, selected && styles.arrowSelected]} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: {
    alignItems: 'center',
    paddingBottom: sizes.marker.arrow,
  },
  wrapSelected: {
    transform: [{ scale: motion.markerSelectedScale }],
  },
  bubble: {
    height: sizes.marker.height,
    minWidth: sizes.marker.height * 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: t.colors.markerBackground,
    borderWidth: sizes.border,
    borderColor: t.colors.goldBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleSelected: {
    backgroundColor: t.colors.markerSelected,
    borderColor: t.colors.markerSelected,
  },
  text: {
    ...typography.caption,
    fontFamily: typography.buttonSm.fontFamily,
    color: t.colors.markerText,
  },
  textSelected: {
    color: t.colors.markerSelectedText,
  },
  arrow: {
    position: 'absolute',
    bottom: sizes.marker.arrow / 2,
    width: sizes.marker.arrow * 2,
    height: sizes.marker.arrow * 2,
    backgroundColor: t.colors.markerBackground,
    borderRightWidth: sizes.border,
    borderBottomWidth: sizes.border,
    borderColor: t.colors.goldBorder,
    transform: [{ rotate: '45deg' }],
  },
  arrowSelected: {
    backgroundColor: t.colors.markerSelected,
    borderColor: t.colors.markerSelected,
  },
}));
