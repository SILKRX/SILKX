import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HotelsDemoNote, starsLabel } from '@/components/hotels/HotelCard';
import { CollapsingHeader } from '@/components/navigation/CollapsingHeader';
import { MiniMap } from '@/components/property/MiniMap';
import { PhotoPager } from '@/components/property/PhotoPager';
import { DetailSection } from '@/components/property/PropertySections';
import { Button, EmptyState, Icon, IconButton, type IconName, Screen, ScreenHeader, Skeleton, SkeletonGroup, StickyBar, Text } from '@/components/ui';
import { useHotel } from '@/hooks/api/hotels';
import { isApiError } from '@/lib/errors';
import { formatUSD } from '@/lib/format';
import { callPhone } from '@/lib/linking';
import { formatUzPhone } from '@/lib/phone';
import { toast } from '@/store/toast';
import { layout, makeStyles, radii, sizes, spacing, useTheme } from '@/theme';
import type { Hotel, HotelAmenity } from '@/types/domain';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

const AMENITY_ICON: Record<HotelAmenity, IconName> = {
  wifi: 'wifi-outline',
  breakfast: 'cafe-outline',
  parking: 'car-outline',
  pool: 'water-outline',
  gym: 'barbell-outline',
  spa: 'flower-outline',
  airport: 'airplane-outline',
  restaurant: 'restaurant-outline',
};

const STEPS = ['hotels.step1', 'hotels.step2', 'hotels.step3', 'hotels.step4'] as const;

function HotelContent({ hotel }: { hotel: Hotel }) {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const galleryHeight = Math.round(height * layout.galleryHeightRatio);
  const headerThreshold = galleryHeight - insets.top - sizes.header;
  const price = t('hotels.perNightFrom', { price: formatUSD(hotel.priceFrom) });

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });

  const openTour = () => router.push({ pathname: '/tour/[id]', params: { id: hotel.id, kind: 'hotel' } });
  const book = () => router.push({ pathname: '/hotel-booking/[id]', params: { id: hotel.id } });
  const askAi = () => router.push({ pathname: '/assistant', params: { district: hotel.district } });
  const call = async () => {
    const ok = await callPhone(hotel.phone);
    if (!ok) toast.info(t('property.callUnavailable'), formatUzPhone(hotel.phone));
  };

  return (
    <View style={styles.root}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingBottom: layout.stickyBarHeight + insets.bottom + spacing.xl }}
      >
        <View>
          <PhotoPager
            images={hotel.images}
            width={width}
            height={galleryHeight}
            showDots={false}
            priority="high"
            recyclingKey={`hotel_detail_${hotel.id}`}
            onPress={openTour}
          />
          <Pressable style={styles.tourPill} onPress={openTour} accessibilityRole="button" accessibilityLabel={t('hotels.view3d')}>
            <Icon name="cube-outline" size="sm" color={colors.textOnGold} />
            <Text variant="buttonSm" style={{ color: colors.textOnGold }}>
              {t('hotels.badge3d')}
            </Text>
          </Pressable>
        </View>

        <View style={styles.sheet}>
          <Text variant="caption" color="gold">
            {starsLabel(hotel.stars)}
          </Text>
          <Text variant="h2">{hotel.name}</Text>
          <View style={styles.row}>
            <Icon name="location-outline" size="sm" color={colors.gold} />
            <Text color="secondary" style={styles.flex}>
              {t(`districts.${hotel.district}`)} · {hotel.address}
            </Text>
          </View>
          <View style={styles.row}>
            <Icon name="star" size="sm" color={colors.gold} />
            <Text variant="bodySm" color="secondary">
              {hotel.rating.toFixed(1)} · {t('property.reviews', { count: hotel.reviewsCount })}
            </Text>
          </View>
          <Text variant="priceLg" style={styles.price}>
            {price}
          </Text>

          <Button title={t('hotels.view3d')} leftIcon="cube-outline" size="lg" fullWidth onPress={openTour} style={styles.block} />

          <DetailSection title={t('hotels.roomsTitle')}>
            <View style={styles.list}>
              {hotel.rooms.map((room) => (
                <Pressable key={room.id} style={styles.roomRow} onPress={openTour} accessibilityRole="button">
                  <View style={styles.roomIcon}>
                    <Icon name="bed-outline" size="md" color={colors.gold} />
                  </View>
                  <View style={styles.flex}>
                    <Text variant="bodyStrong">{t(`hotels.roomTypes.${room.type}`)}</Text>
                    <Text variant="caption" color="secondary">
                      {t('hotels.roomMeta', { area: room.area, guests: room.maxGuests })}
                    </Text>
                  </View>
                  <View style={styles.roomPrice}>
                    <Text variant="bodyStrong">{formatUSD(room.price)}</Text>
                    <Text variant="micro" color="tertiary">
                      {t('hotels.night')}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </DetailSection>

          <DetailSection title={t('hotels.amenitiesTitle')}>
            <View style={styles.amenities}>
              {hotel.amenities.map((a) => (
                <View key={a} style={styles.amenity}>
                  <Icon name={AMENITY_ICON[a]} size="sm" color={colors.gold} />
                  <Text variant="bodySm">{t(`hotels.amenities.${a}`)}</Text>
                </View>
              ))}
            </View>
            <Text variant="caption" color="secondary" style={styles.block}>
              {t('hotels.checkTimes', { checkIn: hotel.checkInTime, checkOut: hotel.checkOutTime })}
            </Text>
          </DetailSection>

          <DetailSection title={t('hotels.howTitle')}>
            <View style={styles.list}>
              {STEPS.map((key, i) => (
                <View key={key} style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text variant="buttonSm" style={{ color: colors.textOnGold }}>
                      {i + 1}
                    </Text>
                  </View>
                  <Text style={styles.flex}>{t(key)}</Text>
                </View>
              ))}
            </View>
          </DetailSection>

          <View style={[styles.longStay, styles.block]}>
            <View style={styles.row}>
              <Icon name="key-outline" size="md" color={colors.gold} />
              <Text variant="h3" style={styles.flex}>
                {t('hotels.longStayTitle')}
              </Text>
            </View>
            <Text color="secondary">{t('hotels.longStayText')}</Text>
            <Button title={t('assistant.ask')} leftIcon="sparkles" variant="secondary" fullWidth onPress={askAi} />
          </View>

          <DetailSection title={t('property.locationTitle')}>
            <MiniMap coords={hotel.coords} label={hotel.name} />
          </DetailSection>

          <View style={styles.block}>
            <HotelsDemoNote />
          </View>
        </View>
      </Animated.ScrollView>

      <CollapsingHeader scrollY={scrollY} threshold={headerThreshold} title={hotel.name} />

      <StickyBar>
        <IconButton icon="call-outline" size="lg" onPress={() => void call()} accessibilityLabel={t('hotels.callReception')} haptic="light" />
        <View style={styles.flex}>
          <Button title={t('hotels.book')} leftIcon="calendar-outline" fullWidth onPress={book} />
        </View>
      </StickyBar>
    </View>
  );
}

export default function HotelScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const query = useHotel(id);

  if (query.data) return <HotelContent hotel={query.data} />;
  if (query.isError) {
    const notFound = isApiError(query.error) && query.error.code === 'NOT_FOUND';
    return (
      <Screen>
        <ScreenHeader />
        <EmptyState
          icon={notFound ? 'bed-outline' : 'cloud-offline-outline'}
          title={notFound ? t('hotels.emptyTitle') : t('errors.generic')}
          actionLabel={notFound ? t('common.back') : t('common.retry')}
          onAction={notFound ? () => router.back() : () => void query.refetch()}
        />
      </Screen>
    );
  }
  return (
    <View style={styles.root}>
      <SkeletonGroup>
        <Skeleton width={width} height={Math.round(height * layout.galleryHeightRatio)} radius={radii.none} />
        <View style={styles.skeletonBody}>
          <Skeleton width="40%" height={spacing.lg} />
          <Skeleton width="80%" height={spacing.xxl} />
          <Skeleton width="60%" height={spacing.lg} />
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
  tourPill: {
    position: 'absolute',
    left: spacing.lg,
    bottom: radii.xxl + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + spacing.xxs,
    borderRadius: radii.pill,
    backgroundColor: t.colors.gold,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  price: {
    marginTop: spacing.xs,
  },
  block: {
    marginTop: spacing.lg,
  },
  list: {
    gap: spacing.sm,
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  roomIcon: {
    width: sizes.iconButton.md,
    height: sizes.iconButton.md,
    borderRadius: radii.md,
    backgroundColor: t.colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomPrice: {
    alignItems: 'flex-end',
  },
  amenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  amenity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepNumber: {
    width: sizes.icon.xl,
    height: sizes.icon.xl,
    borderRadius: radii.pill,
    backgroundColor: t.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  longStay: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: sizes.border,
    borderColor: t.colors.goldBorder,
    backgroundColor: t.colors.goldSoft,
  },
  skeletonBody: {
    padding: layout.screenPadding,
    gap: spacing.md,
  },
}));
