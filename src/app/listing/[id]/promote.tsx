import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { Badge, Button, Icon, type IconName, PressableScale, Screen, ScreenHeader, StickyBar, Text } from '@/components/ui';
import { priceLabel, propertyTitle } from '@/features/property/format';
import { useProperty } from '@/hooks/api/catalog';
import { analytics } from '@/lib/analytics';
import { formatUZS } from '@/lib/format';
import { PROMOTION_TARIFFS } from '@/services/api';
import { layout, makeStyles, motion, radii, sizes, spacing, useTheme } from '@/theme';
import type { PromotionTier } from '@/types/domain';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

const TIER_META: Record<PromotionTier, { icon: IconName; factor: number }> = {
  top: { icon: 'arrow-up-circle-outline', factor: 2 },
  gold: { icon: 'star-outline', factor: 3 },
  vip: { icon: 'diamond-outline', factor: 5 },
};

const POPULAR: PromotionTier = 'gold';

/** Выбор тарифа продвижения: VIP, золотая рамка или поднятие в топ. */
export default function PromoteScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const listingId = id ?? '';
  const property = useProperty(listingId);
  const [tier, setTier] = useState<PromotionTier>(POPULAR);

  const select = (next: PromotionTier) => {
    setTier(next);
    analytics.track('promotion_selected', { tier: next });
  };

  return (
    <Screen>
      <ScreenHeader title={t('promote.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text color="secondary">{t('promote.subtitle')}</Text>
        {property.data ? (
          <View style={styles.listing}>
            {property.data.images[0] ? <Image source={{ uri: property.data.images[0] }} style={styles.thumb} contentFit="cover" /> : null}
            <View style={styles.flex}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {propertyTitle(property.data, t)}
              </Text>
              <Text variant="bodySm" color="secondary">
                {priceLabel(property.data, t)}
              </Text>
            </View>
          </View>
        ) : null}

        {PROMOTION_TARIFFS.map((tariff) => {
          const selected = tariff.id === tier;
          const meta = TIER_META[tariff.id];
          return (
            <PressableScale
              key={tariff.id}
              onPress={() => select(tariff.id)}
              haptic="selection"
              scaleTo={motion.pressScaleSubtle}
              style={[styles.tariff, selected && styles.tariffSelected]}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
            >
              <View style={styles.tariffHeader}>
                <View style={[styles.tariffIcon, selected && styles.tariffIconSelected]}>
                  <Icon name={meta.icon} size="lg" color={selected ? colors.textOnGold : colors.gold} />
                </View>
                <View style={styles.flex}>
                  <Text variant="title">{t(`promote.tiers.${tariff.id}.title`)}</Text>
                  <Text variant="caption" color="secondary">
                    {t('promote.days', { count: tariff.days })} · {t('promote.views', { factor: meta.factor })}
                  </Text>
                </View>
                <Icon name={selected ? 'radio-button-on' : 'radio-button-off'} size="md" color={selected ? colors.gold : colors.textTertiary} />
              </View>
              <Text variant="bodySm" color="secondary">
                {t(`promote.tiers.${tariff.id}.description`)}
              </Text>
              <View style={styles.tariffFooter}>
                <Text variant="h3">{formatUZS(tariff.price, t('units.uzs'))}</Text>
                {tariff.id === POPULAR ? <Badge tone="gold" icon="flame" label={t('promote.popular')} /> : null}
              </View>
            </PressableScale>
          );
        })}
      </ScrollView>
      <StickyBar>
        <View style={styles.flex}>
          <Button
            title={t('promote.toCheckout')}
            rightIcon="arrow-forward"
            fullWidth
            onPress={() => router.push({ pathname: '/checkout', params: { listingId, tier } })}
          />
        </View>
      </StickyBar>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  flex: {
    flex: 1,
  },
  content: {
    padding: layout.screenPadding,
    paddingBottom: layout.stickyBarHeight + spacing.giant,
    gap: spacing.lg,
  },
  listing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  thumb: {
    width: sizes.avatar.lg,
    height: sizes.avatar.lg,
    borderRadius: radii.md,
    backgroundColor: t.colors.skeleton,
  },
  tariff: {
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  tariffSelected: {
    borderColor: t.colors.gold,
    borderWidth: sizes.borderStrong,
    backgroundColor: t.colors.goldSoft,
  },
  tariffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tariffIcon: {
    width: sizes.iconButton.lg,
    height: sizes.iconButton.lg,
    borderRadius: radii.md,
    backgroundColor: t.colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tariffIconSelected: {
    backgroundColor: t.colors.gold,
  },
  tariffFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
}));
