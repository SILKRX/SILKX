import { useLocalSearchParams, useRouter } from 'expo-router';
import { type ComponentRef, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PanoramaViewer, type PanoramaViewerRef } from '@/components/tour/PanoramaViewer';
import { Badge, Button, Chip, EmptyState, Icon, IconButton, type IconName, Screen, ScreenHeader, Text } from '@/components/ui';
import { priceLabel, propertyTitle } from '@/features/property/format';
import { buildHotelTour, buildTour, type RoomKind, sceneLabels, type TourScene } from '@/features/tour/scenes';
import type { ViewerOutbound } from '@/features/tour/viewerHtml';
import { useProperty } from '@/hooks/api/catalog';
import { useHotel } from '@/hooks/api/hotels';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { formatUSD } from '@/lib/format';
import { layout, makeStyles, radii, spacing, useTheme } from '@/theme';
import type { Hotel, Property } from '@/types/domain';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

const ROOM_ICON: Record<RoomKind, IconName> = {
  living: 'tv-outline',
  kitchen: 'restaurant-outline',
  bedroom: 'bed-outline',
  bathroom: 'water-outline',
  balcony: 'sunny-outline',
  hall: 'home-outline',
  office: 'briefcase-outline',
  room: 'bed-outline',
  lobby: 'key-outline',
};

const VIEWER_BACKGROUND = '#0B0C0F';

interface TourProps {
  scenes: TourScene[];
  subtitle: string;
  primaryLabel: string;
  onPrimary: () => void;
  onAssistant: () => void;
}

/** Полноэкранный 3D-тур: и для квартир, и для номеров отелей. */
function Tour({ scenes, subtitle, primaryLabel, onPrimary, onAssistant }: TourProps) {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const viewer = useRef<PanoramaViewerRef>(null);
  const chips = useRef<ComponentRef<typeof ScrollView>>(null);

  const labels = useMemo(
    () => sceneLabels(scenes, (s) => (s.roomType ? t(`hotels.roomTypes.${s.roomType}`) : t(`tour.rooms.${s.room}`))),
    [scenes, t],
  );
  const config = useMemo(
    () => ({
      scenes: scenes.map((s, i) => ({ preview: s.preview, hd: s.hd, startYaw: s.startYaw, label: labels[i] ?? '' })),
      start: 0,
      background: VIEWER_BACKGROUND,
      accent: colors.gold,
    }),
    [scenes, labels, colors.gold],
  );

  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hd, setHd] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hint, setHint] = useState(true);

  const onMessage = (message: ViewerOutbound) => {
    switch (message.type) {
      case 'scene':
        setCurrent(message.index);
        setLoading(true);
        setHd(false);
        setFailed(false);
        chips.current?.scrollTo({ x: Math.max(0, message.index - 1) * 110, animated: true });
        break;
      case 'loaded':
        setLoading(false);
        setHd(message.hd);
        break;
      case 'error':
        setLoading(false);
        setFailed(true);
        break;
      case 'interact':
        setHint(false);
        break;
      case 'ready':
        break;
    }
  };

  const go = (index: number) => {
    if (index === current && !failed) return;
    viewer.current?.send({ type: 'go', index });
    if (failed) setFailed(false);
  };

  return (
    <View style={styles.root}>
      <PanoramaViewer ref={viewer} config={config} onMessage={onMessage} />

      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
        <IconButton icon="close" variant="glass" onPress={() => router.back()} accessibilityLabel={t('common.close')} />
        <View style={styles.titleBox} pointerEvents="none">
          <Text variant="overline" color="gold">
            {t('tour.title')}
          </Text>
          <Text variant="title" color="white" numberOfLines={1}>
            {labels[current]}
          </Text>
          <Text variant="caption" style={styles.muted} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {hd ? <Badge tone="goldSoft" label="HD" /> : <View style={styles.badgeSpacer} />}
      </View>

      {loading ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.center} pointerEvents="none">
          <ActivityIndicator color={colors.gold} size="large" />
          <Text variant="bodySm" color="white">
            {t('tour.loading')}
          </Text>
        </Animated.View>
      ) : null}

      {failed ? (
        <View style={styles.center}>
          <Icon name="cloud-offline-outline" size="xxl" color={colors.white} />
          <Text color="white" align="center">
            {t('tour.error')}
          </Text>
          <Button title={t('common.retry')} variant="onDark" size="sm" onPress={() => go(current)} />
        </View>
      ) : null}

      {hint && !loading && !failed ? (
        <Animated.View entering={FadeIn.delay(300)} exiting={FadeOut} style={styles.hint} pointerEvents="none">
          <Icon name="hand-left-outline" size="sm" color={colors.white} />
          <Text variant="caption" color="white">
            {t('tour.hint')}
          </Text>
        </Animated.View>
      ) : null}

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.md }]}>
        <ScrollView ref={chips} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {scenes.map((scene, index) => (
            <Chip key={scene.id} label={labels[index] ?? ''} icon={ROOM_ICON[scene.room]} selected={index === current} onPress={() => go(index)} />
          ))}
        </ScrollView>
        <View style={styles.actions}>
          <View style={styles.flex}>
            <Button title={t('assistant.ask')} variant="onDark" leftIcon="sparkles-outline" fullWidth onPress={onAssistant} />
          </View>
          <View style={styles.flex}>
            <Button title={primaryLabel} leftIcon="calendar-outline" fullWidth onPress={onPrimary} />
          </View>
        </View>
        <Text variant="micro" align="center" style={styles.muted}>
          {t('tour.demoNote')}
        </Text>
      </View>
    </View>
  );
}

function PropertyTour({ property }: { property: Property }) {
  const router = useRouter();
  const { t } = useTranslation();
  const requireAuth = useRequireAuth();
  const scenes = useMemo(() => buildTour(property), [property]);
  return (
    <Tour
      scenes={scenes}
      subtitle={`${propertyTitle(property, t)} · ${priceLabel(property, t)}`}
      primaryLabel={t('property.bookViewing')}
      onPrimary={() => requireAuth(() => router.push({ pathname: '/book/[id]', params: { id: property.id } }), `/book/${property.id}`)}
      onAssistant={() => router.push({ pathname: '/assistant', params: { propertyId: property.id } })}
    />
  );
}

function HotelTour({ hotel }: { hotel: Hotel }) {
  const router = useRouter();
  const { t } = useTranslation();
  const scenes = useMemo(() => buildHotelTour(hotel), [hotel]);
  return (
    <Tour
      scenes={scenes}
      subtitle={`${hotel.name} · ${t('hotels.perNight', { price: formatUSD(hotel.priceFrom) })}`}
      primaryLabel={t('hotels.book')}
      onPrimary={() => router.push({ pathname: '/hotel-booking/[id]', params: { id: hotel.id } })}
      onAssistant={() => router.push({ pathname: '/assistant', params: { district: hotel.district } })}
    />
  );
}

function Loading() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: VIEWER_BACKGROUND }}>
      <ActivityIndicator color={colors.gold} size="large" />
    </View>
  );
}

function NotFound() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Screen>
      <ScreenHeader />
      <EmptyState icon="home-outline" title={t('property.notFoundTitle')} actionLabel={t('common.close')} onAction={() => router.back()} />
    </Screen>
  );
}

export default function TourScreen() {
  const { id = '', kind } = useLocalSearchParams<{ id: string; kind?: 'hotel' | 'property' }>();
  const isHotel = kind === 'hotel';
  const property = useProperty(id, { enabled: !isHotel });
  const hotel = useHotel(isHotel ? id : '');

  if (isHotel) {
    if (hotel.data) return <HotelTour hotel={hotel.data} />;
    return hotel.isError ? <NotFound /> : <Loading />;
  }
  if (property.data) return <PropertyTour property={property.data} />;
  return property.isError ? <NotFound /> : <Loading />;
}

const useStyles = makeStyles((t) => ({
  root: {
    flex: 1,
    backgroundColor: VIEWER_BACKGROUND,
  },
  flex: {
    flex: 1,
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(11,12,15,0.55)',
  },
  titleBox: {
    flex: 1,
    alignItems: 'center',
  },
  badgeSpacer: {
    width: 42,
  },
  muted: {
    color: t.colors.onImageMuted,
  },
  center: {
    ...({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const),
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xxl,
  },
  hint: {
    position: 'absolute',
    alignSelf: 'center',
    top: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: t.colors.glassOnImage,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: spacing.md,
    gap: spacing.md,
    backgroundColor: 'rgba(11,12,15,0.7)',
  },
  chips: {
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
  },
}));
