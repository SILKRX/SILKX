import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, ScrollView, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Divider, Icon, type IconName, IconButton, PressableScale, StickyBar, Text } from '@/components/ui';
import { propertyTitle } from '@/features/property/format';
import { useProperty } from '@/hooks/api/catalog';
import { usePromoteListing } from '@/hooks/api/business';
import { errorMessageKey } from '@/lib/errors';
import { formatDateTime, formatUZS } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { PROMOTION_TARIFFS } from '@/services/api';
import { toast } from '@/store/toast';
import { layout, makeStyles, motion, radii, sizes, spacing, useTheme } from '@/theme';
import type { PaymentMethod, PaymentReceipt, PromotionTier } from '@/types/domain';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

interface MethodOption {
  id: PaymentMethod;
  icon: IconName;
}

/** Способы оплаты по платформе: Apple Pay — только iOS, Google Pay — только Android. */
function methodsForPlatform(): MethodOption[] {
  const methods: MethodOption[] = [];
  if (Platform.OS === 'ios') methods.push({ id: 'apple_pay', icon: 'logo-apple' });
  if (Platform.OS === 'android') methods.push({ id: 'google_pay', icon: 'logo-google' });
  methods.push({ id: 'click', icon: 'flash-outline' }, { id: 'payme', icon: 'wallet-outline' }, { id: 'uzcard', icon: 'card-outline' });
  return methods;
}

function isTier(value: unknown): value is PromotionTier {
  return value === 'top' || value === 'gold' || value === 'vip';
}

/** Имитация оплаты продвижения (Apple Pay, Google Pay, Click, Payme, Uzcard/Humo) и чек. */
export default function CheckoutScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ listingId?: string; tier?: string }>();
  const listingId = params.listingId ?? '';
  const tier: PromotionTier = isTier(params.tier) ? params.tier : 'gold';
  const tariff = PROMOTION_TARIFFS.find((item) => item.id === tier) ?? PROMOTION_TARIFFS[0];
  const property = useProperty(listingId);
  const promote = usePromoteListing();
  const methods = methodsForPlatform();
  const [method, setMethod] = useState<PaymentMethod>(methods[0]?.id ?? 'click');
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/profile'));

  if (!tariff) return null;
  const amount = formatUZS(tariff.price, t('units.uzs'));

  const pay = () => {
    promote.mutate(
      { listingId, tier, method },
      {
        onSuccess: (result) => {
          haptics.success();
          setReceipt(result);
        },
        onError: (error) => {
          haptics.error();
          toast.error(t(errorMessageKey(error)));
        },
      },
    );
  };

  if (receipt) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.success}>
          <Animated.View entering={ZoomIn.springify()} style={styles.successIcon}>
            <Icon name="checkmark" size="hero" color={colors.textOnGold} />
          </Animated.View>
          <Animated.View entering={FadeIn.delay(motion.fast)} style={styles.successTexts}>
            <Text variant="h2" align="center">
              {t('checkout.successTitle')}
            </Text>
            <Text color="secondary" align="center">
              {t('checkout.successText')}
            </Text>
          </Animated.View>
          <View style={styles.receipt}>
            <Text variant="overline" color="gold">
              {t('checkout.receipt', { id: receipt.id.toUpperCase() })}
            </Text>
            <View style={styles.receiptRow}>
              <Text color="secondary">{t(`promote.tiers.${receipt.tariff}.title`)}</Text>
              <Text variant="bodyStrong">{formatUZS(receipt.amount, t('units.uzs'))}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text color="secondary">{t('checkout.method')}</Text>
              <Text variant="bodyStrong">{t(`checkout.methods.${receipt.method}`)}</Text>
            </View>
            <Text variant="caption" color="tertiary">
              {formatDateTime(new Date(receipt.paidAt), t)}
            </Text>
          </View>
          <Button
            title={t('common.done')}
            fullWidth
            onPress={() => router.dismissTo('/profile')}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text variant="title" style={styles.flex}>
          {t('checkout.title')}
        </Text>
        <IconButton icon="close" variant="ghost" onPress={close} accessibilityLabel={t('common.close')} disabled={promote.isPending} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <Text variant="overline" color="tertiary">
            {t('checkout.summary')}
          </Text>
          <Text variant="title">{t(`promote.tiers.${tariff.id}.title`)}</Text>
          {property.data ? (
            <Text variant="bodySm" color="secondary" numberOfLines={1}>
              {propertyTitle(property.data, t)}
            </Text>
          ) : null}
          <Text variant="bodySm" color="secondary">
            {t('promote.days', { count: tariff.days })}
          </Text>
          <Divider style={styles.divider} />
          <View style={styles.receiptRow}>
            <Text variant="bodyStrong">{t('checkout.total')}</Text>
            <Text variant="h3">{amount}</Text>
          </View>
        </View>

        <Text variant="h3">{t('checkout.method')}</Text>
        <View style={styles.methods}>
          {methods.map((option) => {
            const selected = option.id === method;
            return (
              <PressableScale
                key={option.id}
                onPress={() => setMethod(option.id)}
                haptic="selection"
                scaleTo={motion.pressScaleSubtle}
                disabled={promote.isPending}
                style={[styles.method, selected && styles.methodSelected]}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
              >
                <View style={styles.methodIcon}>
                  <Icon name={option.icon} size="md" color={colors.text} />
                </View>
                <Text variant="bodyStrong" style={styles.flex}>
                  {t(`checkout.methods.${option.id}`)}
                </Text>
                <Icon name={selected ? 'radio-button-on' : 'radio-button-off'} size="md" color={selected ? colors.gold : colors.textTertiary} />
              </PressableScale>
            );
          })}
        </View>
        <View style={styles.demo}>
          <Icon name="information-circle-outline" size="sm" color={colors.info} />
          <Text variant="caption" color="secondary" style={styles.flex}>
            {t('checkout.demoNote')}
          </Text>
        </View>
      </ScrollView>
      <StickyBar>
        {promote.isPending ? (
          <View style={styles.processing}>
            <ActivityIndicator color={colors.gold} />
            <Text variant="bodyStrong">{t('checkout.processing')}</Text>
          </View>
        ) : (
          <View style={styles.flex}>
            <Button title={t('checkout.pay', { amount })} leftIcon="lock-closed" fullWidth onPress={pay} />
          </View>
        )}
      </StickyBar>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    minHeight: sizes.header,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
  },
  content: {
    padding: layout.screenPadding,
    paddingBottom: layout.stickyBarHeight + spacing.giant,
    gap: spacing.lg,
  },
  summary: {
    padding: spacing.lg,
    gap: spacing.xs,
    borderRadius: radii.xl,
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.goldBorder,
  },
  divider: {
    marginVertical: spacing.sm,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  methods: {
    gap: spacing.sm,
  },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  methodSelected: {
    borderColor: t.colors.gold,
    backgroundColor: t.colors.goldSoft,
  },
  methodIcon: {
    width: sizes.iconButton.md,
    height: sizes.iconButton.md,
    borderRadius: radii.md,
    backgroundColor: t.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: t.colors.infoSoft,
  },
  processing: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    height: sizes.button.md,
  },
  success: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.xl,
  },
  successIcon: {
    width: sizes.avatar.xl,
    height: sizes.avatar.xl,
    borderRadius: radii.pill,
    backgroundColor: t.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTexts: {
    gap: spacing.sm,
    maxWidth: layout.textMaxWidth,
  },
  receipt: {
    alignSelf: 'stretch',
    padding: spacing.lg,
    gap: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
}));
