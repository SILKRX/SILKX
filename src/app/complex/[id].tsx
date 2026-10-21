import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, Share, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chessboard } from '@/components/complex/Chessboard';
import { CollapsingHeader } from '@/components/navigation/CollapsingHeader';
import { PhotoPager } from '@/components/property/PhotoPager';
import { PropertyCardCompact } from '@/components/property/PropertyCard';
import { DetailSection, ExpandableText, FeatureGrid, INFRASTRUCTURE_ICONS } from '@/components/property/PropertySections';
import { SellerCard } from '@/components/property/SellerCard';
import {
  Badge,
  Button,
  EmptyState,
  IconButton,
  Screen,
  ScreenHeader,
  Sheet,
  type SheetRef,
  Skeleton,
  SkeletonGroup,
  StickyBar,
  Text,
} from '@/components/ui';
import { roomsLabel } from '@/features/property/format';
import { useComplex, useComplexListings } from '@/hooks/api/catalog';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { analytics } from '@/lib/analytics';
import { isApiError } from '@/lib/errors';
import { formatArea, formatMonthYear, formatUSD, pricePerM2 } from '@/lib/format';
import { callPhone } from '@/lib/linking';
import { formatUzPhone } from '@/lib/phone';
import { toast } from '@/store/toast';
import { layout, makeStyles, motion, radii, sizes, spacing } from '@/theme';
import type { Complex, ComplexUnit, Property } from '@/types/domain';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

function Separator() {
  return <View style={{ width: spacing.md }} />;
}

function ComplexContent({ complex }: { complex: Complex }) {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const requireAuth = useRequireAuth();
  const listings = useComplexListings(complex.id);
  const unitSheet = useRef<SheetRef>(null);
  const [unit, setUnit] = useState<ComplexUnit | null>(null);

  const galleryHeight = Math.round(height * layout.galleryHeightRatio);
  const renderWidth = Math.round(width * layout.renderCardRatio);
  const cardWidth = Math.round(width * layout.carouselCardRatio);
  const available = complex.units.filter((u) => u.status === 'available').length;
  const firstListing = listings.data?.[0];

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });

  const openGallery = (index: number) =>
    router.push({ pathname: '/gallery/[id]', params: { id: complex.id, index: String(index), source: 'complex' } });

  const call = async () => {
    const ok = await callPhone(complex.developer.phone);
    if (!ok) toast.info(t('property.callUnavailable'), formatUzPhone(complex.developer.phone));
  };

  const book = (listing: Property | undefined) => {
    if (!listing) {
      void call();
      return;
    }
    requireAuth(() => router.push({ pathname: '/book/[id]', params: { id: listing.id } }), `/book/${listing.id}`);
  };

  const openUnit = (next: ComplexUnit) => {
    analytics.track('complex_unit_tapped', { complexId: complex.id, unitId: next.id });
    setUnit(next);
    unitSheet.current?.present();
  };

  const share = async () => {
    try {
      await Share.share({ message: `${complex.name} — ${t('complex.from', { price: formatUSD(complex.priceFrom) })}. SILKX` });
    } catch {
      // закрыто пользователем
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
        <PhotoPager images={complex.heroImages} width={width} height={galleryHeight} priority="high" onPress={openGallery} recyclingKey={`complex_${complex.id}`} />

        <View style={styles.sheet}>
          <View style={styles.badges}>
            <Badge tone="gold" icon="sparkles" label={t(`complex.class.${complex.class}`)} />
            {complex.installment ? <Badge tone="goldSoft" icon="card-outline" label={t('complex.installment')} /> : null}
            <Badge tone="success" icon="key-outline" label={t('complex.available', { count: available })} />
          </View>
          <Text variant="h1">{complex.name}</Text>
          <Text color="secondary">
            {complex.developer.name} · {t(`districts.${complex.district}`)}
          </Text>
          <View style={styles.priceRow}>
            <View style={styles.flex}>
              <Text variant="price">{t('complex.from', { price: formatUSD(complex.priceFrom) })}</Text>
              <Text variant="bodySm" color="secondary">
                {t('complex.perM2From', { price: formatUSD(complex.pricePerM2From) })}
              </Text>
            </View>
            <Badge tone="neutral" icon="calendar-outline" label={t('complex.completion', { date: formatMonthYear(new Date(complex.completion), t) })} />
          </View>

          <DetailSection title={t('complex.about')}>
            <ExpandableText text={complex.description} />
          </DetailSection>

          <DetailSection title={t('complex.infrastructure')}>
            <FeatureGrid
              items={complex.infrastructure.map((item) => ({ key: item, icon: INFRASTRUCTURE_ICONS[item], label: t(`infrastructure.${item}`) }))}
            />
          </DetailSection>
        </View>

        {complex.renders.length > 0 ? (
          <View style={styles.rail}>
            <Text variant="h3" style={styles.railTitle}>
              {t('complex.architecture')}
            </Text>
            <FlatList
              horizontal
              data={complex.renders}
              keyExtractor={(uri, i) => `${uri}_${i}`}
              renderItem={({ item, index }) => (
                <Pressable onPress={() => openGallery(complex.heroImages.length + index)} accessibilityRole="imagebutton">
                  <Image
                    source={{ uri: item }}
                    style={[styles.render, { width: renderWidth, height: Math.round(renderWidth / layout.wideImageAspect) }]}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={motion.base}
                  />
                </Pressable>
              )}
              ItemSeparatorComponent={Separator}
              showsHorizontalScrollIndicator={false}
              snapToInterval={renderWidth + spacing.md}
              decelerationRate="fast"
              contentContainerStyle={styles.railContent}
            />
          </View>
        ) : null}

        <View style={styles.section}>
          <DetailSection title={t('complex.masterPlan')}>
            <Pressable onPress={() => openGallery(complex.heroImages.length + complex.renders.length)} accessibilityRole="imagebutton">
              <Image source={{ uri: complex.masterPlan }} style={styles.masterPlan} contentFit="cover" cachePolicy="memory-disk" transition={motion.base} />
            </Pressable>
          </DetailSection>

          <DetailSection title={t('complex.chessboard')}>
            <Chessboard complex={complex} onUnitPress={openUnit} />
          </DetailSection>
        </View>

        {listings.data && listings.data.length > 0 ? (
          <View style={styles.rail}>
            <Text variant="h3" style={styles.railTitle}>
              {t('complex.listings')}
            </Text>
            <FlatList<Property>
              horizontal
              data={listings.data}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <PropertyCardCompact property={item} width={cardWidth} source="complex" />}
              ItemSeparatorComponent={Separator}
              showsHorizontalScrollIndicator={false}
              snapToInterval={cardWidth + spacing.md}
              decelerationRate="fast"
              contentContainerStyle={styles.railContent}
            />
          </View>
        ) : null}

        <View style={styles.section}>
          <DetailSection title={t('property.sellerKind.developer')}>
            <SellerCard seller={complex.developer} onCall={() => void call()} />
          </DetailSection>
        </View>
      </Animated.ScrollView>

      <CollapsingHeader
        scrollY={scrollY}
        threshold={galleryHeight - insets.top - sizes.header}
        title={complex.name}
        right={(solid) => (
          <IconButton icon="share-outline" variant={solid ? 'ghost' : 'glass'} onPress={() => void share()} accessibilityLabel={t('common.share')} />
        )}
      />

      <StickyBar>
        <IconButton icon="call-outline" size="lg" onPress={() => void call()} accessibilityLabel={t('common.call')} haptic="light" />
        <View style={styles.flex}>
          <Button title={t('property.bookViewing')} leftIcon="calendar-outline" fullWidth onPress={() => book(firstListing)} />
        </View>
      </StickyBar>

      <Sheet ref={unitSheet} title={unit ? t('complex.unitTitle', { number: unit.number }) : undefined} onDismiss={() => setUnit(null)}>
        {unit ? (
          <View style={styles.unitBody}>
            <Text color="secondary">
              {t('complex.unitDetails', { rooms: roomsLabel(unit.rooms, t), area: formatArea(unit.area), floor: unit.floor })}
            </Text>
            <View style={styles.unitPrice}>
              <Text variant="priceLg">{formatUSD(unit.price)}</Text>
              <Text variant="bodySm" color="secondary">
                {t('property.perM2', { price: formatUSD(pricePerM2(unit.price, unit.area)) })}
              </Text>
            </View>
            <Badge tone="goldSoft" icon="cube-outline" label={t('complex.block', { name: unit.block })} />
            <Button
              title={t('complex.requestUnit')}
              leftIcon="calendar-outline"
              fullWidth
              onPress={() => {
                unitSheet.current?.dismiss();
                book(firstListing);
              }}
            />
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

export default function ComplexScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useComplex(id ?? '');

  if (query.data) return <ComplexContent complex={query.data} />;

  if (query.isError) {
    const notFound = isApiError(query.error) && query.error.code === 'NOT_FOUND';
    return (
      <Screen>
        <ScreenHeader />
        <EmptyState
          icon={notFound ? 'business-outline' : 'cloud-offline-outline'}
          title={notFound ? t('complex.notFound') : t('errors.generic')}
          actionLabel={notFound ? t('errors.goHome') : t('common.retry')}
          onAction={notFound ? () => router.replace('/') : () => void query.refetch()}
        />
      </Screen>
    );
  }

  return (
    <View style={styles.root}>
      <SkeletonGroup>
        <Skeleton width={width} height={Math.round(height * layout.galleryHeightRatio)} radius={radii.none} />
        <View style={styles.skeletonBody}>
          <Skeleton width="40%" height={spacing.xl} />
          <Skeleton width="75%" height={spacing.xxxl} />
          <Skeleton width="55%" height={spacing.lg} />
        </View>
      </SkeletonGroup>
    </View>
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
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  section: {
    paddingHorizontal: layout.screenPadding,
  },
  rail: {
    paddingTop: spacing.xxl,
  },
  railTitle: {
    paddingHorizontal: layout.screenPadding,
    marginBottom: spacing.md,
  },
  railContent: {
    paddingHorizontal: layout.screenPadding,
  },
  render: {
    borderRadius: radii.lg,
    backgroundColor: t.colors.skeleton,
  },
  masterPlan: {
    height: layout.masterPlanHeight,
    borderRadius: radii.lg,
    backgroundColor: t.colors.skeleton,
  },
  unitBody: {
    gap: spacing.md,
  },
  unitPrice: {
    gap: spacing.xxs,
  },
  skeletonBody: {
    padding: layout.screenPadding,
    gap: spacing.md,
  },
}));
