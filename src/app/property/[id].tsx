import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, Share, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CollapsingHeader } from '@/components/navigation/CollapsingHeader';
import { FavoriteButton } from '@/components/property/FavoriteButton';
import { MiniMap } from '@/components/property/MiniMap';
import { MortgageCalculator } from '@/components/property/MortgageCalculator';
import { PhotoPager } from '@/components/property/PhotoPager';
import { PropertyBadges } from '@/components/property/PropertyBadges';
import { PropertyCardCompact } from '@/components/property/PropertyCard';
import { AmenitiesGrid, DetailSection, ExpandableText, SpecsGrid } from '@/components/property/PropertySections';
import { SellerCard } from '@/components/property/SellerCard';
import { FeatureGate } from '@/components/system/AppSync';
import { Badge, Button, EmptyState, Icon, IconButton, Screen, ScreenHeader, Skeleton, SkeletonGroup, StickyBar, Text } from '@/components/ui';
import { perM2Label, priceDropPercent, priceLabel, propertyTitle } from '@/features/property/format';
import { useComplex, useProperty, useSimilarProperties } from '@/hooks/api/catalog';
import { useStartChat } from '@/hooks/api/engagement';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { analytics } from '@/lib/analytics';
import { errorMessageKey, isApiError } from '@/lib/errors';
import { formatUSD } from '@/lib/format';
import { callPhone } from '@/lib/linking';
import { formatUzPhone } from '@/lib/phone';
import { api } from '@/services/api';
import { useHistoryStore } from '@/store/history';
import { useRole, useUserId } from '@/store/session';
import { toast } from '@/store/toast';
import { layout, makeStyles, motion, radii, sizes, spacing, useTheme } from '@/theme';
import type { Property } from '@/types/domain';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

function Separator() {
  return <View style={{ width: spacing.md }} />;
}

function ComplexLink({ complexId }: { complexId: string }) {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const complex = useComplex(complexId);
  if (!complex.data) return null;
  return (
    <Pressable
      style={styles.complexLink}
      onPress={() => router.push({ pathname: '/complex/[id]', params: { id: complexId } })}
      accessibilityRole="button"
    >
      <View style={styles.complexIcon}>
        <Icon name="business-outline" size="md" color={colors.gold} />
      </View>
      <View style={styles.flex}>
        <Text variant="caption" color="secondary">
          {t('property.inComplex')}
        </Text>
        <Text variant="bodyStrong" numberOfLines={1}>
          {complex.data.name}
        </Text>
      </View>
      <Text variant="buttonSm" color="gold">
        {t('property.openComplex')}
      </Text>
      <Icon name="chevron-forward" size="sm" color={colors.gold} />
    </Pressable>
  );
}

function PropertyContent({ property }: { property: Property }) {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const requireAuth = useRequireAuth();
  const startChat = useStartChat();
  const similar = useSimilarProperties(property.id);
  const userId = useUserId();
  const role = useRole();
  const trackHistory = useHistoryStore((s) => s.track);
  const [photoIndex, setPhotoIndex] = useState(0);

  const galleryHeight = Math.round(height * layout.galleryHeightRatio);
  const headerThreshold = galleryHeight - insets.top - sizes.header;
  const similarWidth = Math.round(width * layout.carouselCardRatio);
  const isOwn = property.seller.id === userId;
  const drop = priceDropPercent(property);
  const perM2 = perM2Label(property, t);
  const title = propertyTitle(property, t);

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });

  useEffect(() => {
    trackHistory(property.id);
  }, [property.id, trackHistory]);

  const openGallery = (index: number) =>
    router.push({ pathname: '/gallery/[id]', params: { id: property.id, index: String(index), source: 'property' } });

  const call = async () => {
    analytics.track('call_tapped', { propertyId: property.id });
    api.properties.recordCall(property.id).catch(() => undefined);
    const ok = await callPhone(property.seller.phone);
    if (!ok) toast.info(t('property.callUnavailable'), formatUzPhone(property.seller.phone));
  };

  const message = () =>
    requireAuth(() => {
      startChat.mutate(property.id, {
        onSuccess: (conversation) => router.push({ pathname: '/chats/[id]', params: { id: conversation.id } }),
        onError: (error) => toast.error(t(errorMessageKey(error))),
      });
    }, `/property/${property.id}`);

  const book = () => requireAuth(() => router.push({ pathname: '/book/[id]', params: { id: property.id } }), `/book/${property.id}`);

  const share = async () => {
    analytics.track('share_tapped', { propertyId: property.id });
    try {
      await Share.share({ message: t('property.shareMessage', { title, price: priceLabel(property, t) }) });
    } catch {
      // пользователь закрыл системное меню — это не ошибка
    }
  };

  return (
    <View style={styles.root}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={motion.scrollThrottle}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingBottom: layout.stickyBarHeight + insets.bottom + spacing.xl }}
      >
        <View>
          <PhotoPager
            images={property.images}
            width={width}
            height={galleryHeight}
            showDots={false}
            priority="high"
            recyclingKey={`detail_${property.id}`}
            onPress={openGallery}
            onIndexChange={(index) => {
              setPhotoIndex(index);
              analytics.track('gallery_swiped', { propertyId: property.id, index });
            }}
          />
          {property.images.length > 1 ? (
            <View style={styles.counter} pointerEvents="none">
              <Icon name="images-outline" size="xs" color={colors.white} />
              <Text variant="caption" color="white">
                {t('property.photoCounter', { current: photoIndex + 1, total: property.images.length })}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.sheet}>
          <View style={styles.badges}>
            <PropertyBadges property={property} />
            {property.seller.verified ? <Badge tone="goldSoft" icon="shield-checkmark" label={t('property.verified')} /> : null}
          </View>

          <View style={styles.priceBlock}>
            <Text variant="priceLg">{priceLabel(property, t)}</Text>
            <View style={styles.priceMeta}>
              {perM2 ? (
                <Text variant="bodySm" color="secondary">
                  {perM2}
                </Text>
              ) : null}
              {drop && property.previousPrice ? (
                <Text variant="bodySm" color="tertiary" style={styles.strike}>
                  {formatUSD(property.previousPrice)}
                </Text>
              ) : null}
            </View>
          </View>

          <Text variant="h2">{title}</Text>
          <View style={styles.addressRow}>
            <Icon name="location-outline" size="sm" color={colors.gold} />
            <Text color="secondary" style={styles.flex}>
              {t(`districts.${property.district}`)} · {property.address}
            </Text>
          </View>
          <Text variant="caption" color="tertiary">
            {t('property.views', { count: property.views })}
          </Text>

          <View style={styles.block}>
            <SpecsGrid property={property} />
          </View>

          {property.complexId ? (
            <View style={styles.block}>
              <ComplexLink complexId={property.complexId} />
            </View>
          ) : null}

          {property.description ? (
            <DetailSection title={t('property.descriptionTitle')}>
              <ExpandableText text={property.description} />
            </DetailSection>
          ) : null}

          {property.amenities.length > 0 ? (
            <DetailSection title={t('property.amenitiesTitle')}>
              <AmenitiesGrid amenities={property.amenities} />
            </DetailSection>
          ) : null}

          <DetailSection title={t('property.locationTitle')}>
            <MiniMap coords={property.coords} label={property.address} />
          </DetailSection>

          {property.dealType === 'sale' ? (
            <FeatureGate flag="mortgageCalculator">
              <DetailSection title={t('mortgage.title')}>
                <MortgageCalculator property={property} />
              </DetailSection>
            </FeatureGate>
          ) : null}

          <DetailSection title={t('property.sellerTitle')}>
            <SellerCard
              seller={property.seller}
              onMessage={isOwn ? undefined : message}
              messageLoading={startChat.isPending}
            />
          </DetailSection>
        </View>

        {similar.data && similar.data.length > 0 ? (
          <View style={styles.similar}>
            <Text variant="h3" style={styles.similarTitle}>
              {t('property.similar')}
            </Text>
            <FlatList<Property>
              horizontal
              data={similar.data}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <PropertyCardCompact property={item} width={similarWidth} source="similar" />}
              ItemSeparatorComponent={Separator}
              showsHorizontalScrollIndicator={false}
              snapToInterval={similarWidth + spacing.md}
              decelerationRate="fast"
              contentContainerStyle={styles.similarContent}
            />
          </View>
        ) : null}
      </Animated.ScrollView>

      <CollapsingHeader
        scrollY={scrollY}
        threshold={headerThreshold}
        title={priceLabel(property, t)}
        right={(solid) => (
          <>
            <IconButton icon="share-outline" variant={solid ? 'ghost' : 'glass'} onPress={() => void share()} accessibilityLabel={t('common.share')} />
            <FavoriteButton propertyId={property.id} variant={solid ? 'surface' : 'glass'} />
          </>
        )}
      />

      <StickyBar>
        {isOwn ? (
          role === 'seller' ? (
            <View style={styles.flex}>
              <Button
                title={t('profile.promote')}
                leftIcon="rocket-outline"
                fullWidth
                onPress={() => router.push({ pathname: '/listing/[id]/promote', params: { id: property.id } })}
              />
            </View>
          ) : (
            <Text color="secondary" style={styles.flex} align="center">
              {t('property.ownListing')}
            </Text>
          )
        ) : (
          <>
            <IconButton icon="call-outline" size="lg" onPress={() => void call()} accessibilityLabel={t('common.call')} haptic="light" />
            <IconButton icon="chatbubble-ellipses-outline" size="lg" onPress={message} accessibilityLabel={t('property.writeMessage')} haptic="light" />
            <View style={styles.flex}>
              <Button title={t('property.bookViewing')} leftIcon="calendar-outline" fullWidth onPress={book} />
            </View>
          </>
        )}
      </StickyBar>
    </View>
  );
}

function PropertySkeleton() {
  const styles = useStyles();
  const { width, height } = useWindowDimensions();
  const tile = (width - layout.screenPadding * 2 - spacing.md) / 2;
  return (
    <View style={styles.root}>
      <SkeletonGroup>
        <Skeleton width={width} height={Math.round(height * layout.galleryHeightRatio)} radius={radii.none} />
        <View style={styles.skeletonBody}>
          <Skeleton width="50%" height={spacing.xxxl} />
          <Skeleton width="80%" height={spacing.xxl} />
          <Skeleton width="60%" height={spacing.lg} />
          <View style={styles.skeletonGrid}>
            <Skeleton width={tile} height={sizes.avatar.xl} radius={radii.lg} />
            <Skeleton width={tile} height={sizes.avatar.xl} radius={radii.lg} />
          </View>
        </View>
      </SkeletonGroup>
    </View>
  );
}

export default function PropertyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useProperty(id ?? '');

  if (query.data) return <PropertyContent property={query.data} />;

  if (query.isError) {
    const notFound = isApiError(query.error) && query.error.code === 'NOT_FOUND';
    return (
      <Screen>
        <ScreenHeader />
        <EmptyState
          icon={notFound ? 'home-outline' : 'cloud-offline-outline'}
          title={notFound ? t('property.notFoundTitle') : t('errors.generic')}
          text={notFound ? t('property.notFoundText') : undefined}
          actionLabel={notFound ? t('errors.goHome') : t('common.retry')}
          onAction={notFound ? () => router.replace('/') : () => void query.refetch()}
        />
      </Screen>
    );
  }

  return <PropertySkeleton />;
}

const useStyles = makeStyles((t) => ({
  root: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  flex: {
    flex: 1,
  },
  counter: {
    position: 'absolute',
    right: spacing.lg,
    bottom: radii.xxl + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: t.colors.glassOnImage,
  },
  sheet: {
    marginTop: -radii.xxl,
    paddingTop: spacing.xl,
    paddingHorizontal: layout.screenPadding,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    backgroundColor: t.colors.background,
    gap: spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  priceBlock: {
    gap: spacing.xxs,
    marginTop: spacing.xs,
  },
  priceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  strike: {
    textDecorationLine: 'line-through',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  block: {
    marginTop: spacing.lg,
  },
  complexLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: sizes.border,
    borderColor: t.colors.goldBorder,
    backgroundColor: t.colors.goldSoft,
  },
  complexIcon: {
    width: sizes.iconButton.md,
    height: sizes.iconButton.md,
    borderRadius: radii.md,
    backgroundColor: t.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  similar: {
    paddingTop: spacing.xxl,
  },
  similarTitle: {
    paddingHorizontal: layout.screenPadding,
    marginBottom: spacing.md,
  },
  similarContent: {
    paddingHorizontal: layout.screenPadding,
  },
  skeletonBody: {
    padding: layout.screenPadding,
    gap: spacing.md,
  },
  skeletonGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
}));
