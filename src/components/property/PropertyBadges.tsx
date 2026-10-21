import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Badge } from '@/components/ui';
import { priceDropPercent } from '@/features/property/format';
import { makeStyles, spacing } from '@/theme';
import type { Property } from '@/types/domain';

/** Бейджи поверх фото: VIP, горячее, снижение цены, премиум. Максимум два — без визуального шума. */
export function PropertyBadges({ property, max = 2 }: { property: Property; max?: number }) {
  const styles = useStyles();
  const { t } = useTranslation();
  const drop = priceDropPercent(property);
  const badges: { key: string; node: ReactNode }[] = [];
  if (property.promotion === 'vip') badges.push({ key: 'vip', node: <Badge tone="gold" icon="diamond" label={t('property.vip')} /> });
  if (drop) badges.push({ key: 'drop', node: <Badge tone="success" icon="trending-down" label={`−${drop}%`} /> });
  if (property.isHot) badges.push({ key: 'hot', node: <Badge tone="glass" icon="flame" label={t('property.hot')} /> });
  if (property.isPremium) badges.push({ key: 'premium', node: <Badge tone="glass" icon="sparkles" label={t('property.premium')} /> });
  if (badges.length === 0) return null;
  return (
    <View style={styles.row} pointerEvents="none">
      {badges.slice(0, max).map((b) => (
        <View key={b.key}>{b.node}</View>
      ))}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  row: {
    flexDirection: 'row',
    gap: spacing.xs + spacing.xxs,
    flexWrap: 'wrap',
  },
}));
