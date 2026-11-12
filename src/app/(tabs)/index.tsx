import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedHero } from '@/components/home/AnimatedHero';
import { HeroSearchBar, HomeTopBar, QuickActions, WhySilkx } from '@/components/home/HomeParts';
import { HotelCard, HotelCardSkeleton } from '@/components/hotels/HotelCard';
import { ComplexCard, ComplexCardSkeleton } from '@/components/property/ComplexCard';
import { PropertyCardCompact, PropertyCardSkeleton } from '@/components/property/PropertyCard';
import { FeatureGate } from '@/components/system/AppSync';
import { EmptyState, SectionHeader, SkeletonGroup, Text } from '@/components/ui';
import { useComplexes, useHotProperties } from '@/hooks/api/catalog';
import { useHotels } from '@/hooks/api/hotels';
import { usePullToRefresh, useRefreshOnFocus } from '@/hooks/common';
import { layout, makeStyles, motion, opacity, radii, sizes, spacing, useTheme } from '@/theme';
import type { Complex, Hotel, Property } from '@/types/domain';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

const SKELETON_ITEMS = [0, 1, 2];
const TITLE_MAX_LINES = 3;
const TITLE_MIN_SCALE = 0.8;

function Separator() {
  return <View style={{ width: spacing.md }} />;
}

export default function HomeScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const heroHeight = Math.round(height * layout.heroHeightRatio);
  const cardWidth = Math.round(width * layout.carouselCardRatio);
  const complexWidth = Math.round(width * layout.complexCardRatio);

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });

  const hot = useHotProperties();
  const complexes = useComplexes();
  const premium = (complexes.data ?? []).filter((c) => c.class !== 'comfort');
  const hotels = useHotels(null);

  const { refreshing, onRefresh } = usePullToRefresh(() => Promise.all([hot.refetch(), complexes.refetch(), hotels.refetch()]));
  useRefreshOnFocus(hot.refetch);

  return (
    <View style={styles.root}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={motion.scrollThrottle}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold}
            colors={[colors.gold]}
            progressBackgroundColor={colors.surface}
            progressViewOffset={insets.top + sizes.header}
          />
        }
      >
        <AnimatedHero height={heroHeight} scrollY={scrollY}>
          <View style={[styles.heroContent, { paddingTop: insets.top + sizes.header }]}>
            <View style={styles.heroTexts}>
              <Text
                variant="display"
                color="white"
                numberOfLines={TITLE_MAX_LINES}
                adjustsFontSizeToFit
                minimumFontScale={TITLE_MIN_SCALE}
                accessibilityRole="header"
              >
                {t('home.heroTitle')}
              </Text>
              <Text color="white" style={styles.heroSubtitle}>
                {t('home.heroSubtitle')}
              </Text>
            </View>
            <HeroSearchBar />
            <QuickActions />
          </View>
        </AnimatedHero>

        <View style={styles.sheet}>
          <SectionHeader
            title={t('home.hotOffers')}
            subtitle={t('home.hotOffersSubtitle')}
            actionLabel={t('common.seeAll')}
            onAction={() => router.push({ pathname: '/catalog', params: { view: 'list' } })}
          />
          {hot.isError && !hot.data ? (
            <EmptyState compact icon="cloud-offline-outline" title={t('errors.generic')} actionLabel={t('common.retry')} onAction={() => void hot.refetch()} />
          ) : (
            <SkeletonGroup>
              <FlatList<Property>
                horizontal
                data={hot.data}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <PropertyCardCompact property={item} width={cardWidth} source="home_hot" />}
                ItemSeparatorComponent={Separator}
                ListEmptyComponent={
                  hot.isPending ? (
                    <View style={styles.skeletonRow}>
                      {SKELETON_ITEMS.map((i) => (
                        <PropertyCardSkeleton key={i} width={cardWidth} compact />
                      ))}
                    </View>
                  ) : undefined
                }
                showsHorizontalScrollIndicator={false}
                snapToInterval={cardWidth + spacing.md}
                decelerationRate="fast"
                contentContainerStyle={styles.carousel}
              />
            </SkeletonGroup>
          )}

          {hotels.isError && !hotels.data ? null : (
            <View style={styles.section}>
              <SectionHeader
                title={t('hotels.homeTitle')}
                subtitle={t('hotels.homeSubtitle')}
                actionLabel={t('hotels.allHotels')}
                onAction={() => router.push('/hotels')}
              />
              <SkeletonGroup>
                <FlatList<Hotel>
                  horizontal
                  data={hotels.data}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => <HotelCard hotel={item} width={cardWidth} />}
                  ItemSeparatorComponent={Separator}
                  ListEmptyComponent={
                    hotels.isPending ? (
                      <View style={styles.skeletonRow}>
                        {SKELETON_ITEMS.map((i) => (
                          <HotelCardSkeleton key={i} width={cardWidth} />
                        ))}
                      </View>
                    ) : undefined
                  }
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={cardWidth + spacing.md}
                  decelerationRate="fast"
                  contentContainerStyle={styles.carousel}
                />
              </SkeletonGroup>
            </View>
          )}

          <FeatureGate flag="developerShowcases">
            <View style={styles.section}>
              <SectionHeader
                title={t('home.premiumComplexes')}
                subtitle={t('home.premiumComplexesSubtitle')}
                actionLabel={t('common.seeAll')}
                onAction={() => router.push({ pathname: '/catalog', params: { view: 'list', section: 'complexes' } })}
              />
              {complexes.isError && !complexes.data ? (
                <EmptyState
                  compact
                  icon="cloud-offline-outline"
                  title={t('errors.generic')}
                  actionLabel={t('common.retry')}
                  onAction={() => void complexes.refetch()}
                />
              ) : (
                <SkeletonGroup>
                  <FlatList<Complex>
                    horizontal
                    data={premium}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <ComplexCard complex={item} width={complexWidth} />}
                    ItemSeparatorComponent={Separator}
                    ListEmptyComponent={
                      complexes.isPending ? (
                        <View style={styles.skeletonRow}>
                          {SKELETON_ITEMS.slice(0, 2).map((i) => (
                            <ComplexCardSkeleton key={i} width={complexWidth} />
                          ))}
                        </View>
                      ) : undefined
                    }
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={complexWidth + spacing.md}
                    decelerationRate="fast"
                    contentContainerStyle={styles.carousel}
                  />
                </SkeletonGroup>
              )}
            </View>
          </FeatureGate>

          <WhySilkx />
          <View style={styles.bottomSpacer} />
        </View>
      </Animated.ScrollView>
      <HomeTopBar scrollY={scrollY} heroHeight={heroHeight} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  heroContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: radii.xxl + spacing.lg,
    gap: spacing.lg,
  },
  heroTexts: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  heroSubtitle: {
    maxWidth: layout.textMaxWidth,
    opacity: opacity.pressed,
  },
  sheet: {
    marginTop: -radii.xxl,
    paddingTop: spacing.xxl,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    backgroundColor: t.colors.background,
  },
  section: {
    marginTop: spacing.xxxl,
  },
  carousel: {
    paddingHorizontal: spacing.lg,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  bottomSpacer: {
    height: spacing.xxxl,
  },
}));
