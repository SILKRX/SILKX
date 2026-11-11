import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { starsLabel } from '@/components/hotels/HotelCard';
import { Button, Icon, IconButton, PhoneField, PressableScale, StickyBar, Text, TextField } from '@/components/ui';
import { useBookHotel, useHotel } from '@/hooks/api/hotels';
import { addDays, formatDayMonth, formatUSD, monthShort, startOfDay, toDateKey, weekdayShort } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { hasValidUzOperator, isCompleteUzPhone, normalizeUzPhone, toE164 } from '@/lib/phone';
import { useSessionStore } from '@/store/session';
import { toast } from '@/store/toast';
import { layout, makeStyles, motion, radii, sizes, spacing, useTheme } from '@/theme';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

const CHECK_IN_DAYS = 45;
const MAX_NIGHTS = 30;
const NAME_MIN = 2;

function DayStrip({ days, selected, onSelect }: { days: Date[]; selected: Date | null; onSelect: (d: Date) => void }) {
  const styles = useStyles();
  const { t } = useTranslation();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysRow}>
      {days.map((date) => {
        const active = selected !== null && toDateKey(selected) === toDateKey(date);
        return (
          <PressableScale
            key={toDateKey(date)}
            haptic="selection"
            onPress={() => onSelect(date)}
            style={[styles.day, active && styles.daySelected]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={formatDayMonth(date, t)}
          >
            <Text variant="caption" style={active ? styles.onGold : undefined} color={active ? undefined : 'secondary'}>
              {weekdayShort(date, t)}
            </Text>
            <Text variant="h3" style={active ? styles.onGold : undefined}>
              {date.getDate()}
            </Text>
            <Text variant="micro" style={active ? styles.onGold : undefined} color={active ? undefined : 'tertiary'}>
              {monthShort(date, t)}
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

/** Заявка на бронь отеля без предоплаты: даты, гости, имя, телефон → «Заявка отправлена!». */
export default function HotelBookingScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const hotel = useHotel(id);
  const book = useBookHotel();
  const user = useSessionStore((s) => s.user);

  const today = useMemo(() => startOfDay(new Date()), []);
  const checkInDays = useMemo(() => Array.from({ length: CHECK_IN_DAYS }, (_, i) => addDays(today, i)), [today]);

  const [checkIn, setCheckIn] = useState<Date>(today);
  const [checkOut, setCheckOut] = useState<Date>(addDays(today, 1));
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(normalizeUzPhone(user?.phone ?? ''));
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);

  const checkOutDays = useMemo(() => Array.from({ length: MAX_NIGHTS }, (_, i) => addDays(checkIn, i + 1)), [checkIn]);
  const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000);
  const maxGuests = Math.max(...(hotel.data?.rooms.map((r) => r.maxGuests) ?? [4]));

  const nameError = name.trim().length < NAME_MIN ? t('validation.nameMin') : undefined;
  const phoneError = !isCompleteUzPhone(phone) ? t('validation.phone') : !hasValidUzOperator(phone) ? t('validation.phoneOperator') : undefined;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/hotels'));

  const pickCheckIn = (date: Date) => {
    setCheckIn(date);
    // выезд всегда хотя бы на следующий день после заезда
    if (checkOut <= date || nights > MAX_NIGHTS) setCheckOut(addDays(date, 1));
  };

  const submit = () => {
    setTouched(true);
    if (nameError || phoneError || !hotel.data) return;
    book.mutate(
      { hotelId: hotel.data.id, checkIn: toDateKey(checkIn), checkOut: toDateKey(checkOut), guests, name: name.trim(), phone: toE164(phone) },
      {
        onSuccess: () => {
          haptics.success();
          setSent(true);
        },
        onError: () => {
          haptics.error();
          toast.error(t('hotels.sendError'));
        },
      },
    );
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.success}>
          <Animated.View entering={ZoomIn.springify()} style={styles.successIcon}>
            <Icon name="checkmark" size="hero" color={colors.textOnGold} />
          </Animated.View>
          <Animated.View entering={FadeIn.delay(motion.fast)} style={styles.successTexts}>
            <Text variant="h2" align="center">
              {t('hotels.sentTitle')}
            </Text>
            <Text color="secondary" align="center">
              {t('hotels.sentText')}
            </Text>
          </Animated.View>
          <View style={styles.successActions}>
            <Button title={t('hotels.ok')} fullWidth onPress={close} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const estimate = hotel.data ? hotel.data.priceFrom * nights : 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text variant="title" style={styles.flex}>
          {t('hotels.formTitle')}
        </Text>
        <IconButton icon="close" variant="ghost" onPress={close} accessibilityLabel={t('common.close')} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        bottomOffset={layout.stickyBarHeight + spacing.xxl}
        showsVerticalScrollIndicator={false}
      >
        {hotel.data ? (
          <View style={styles.hotelCard}>
            {hotel.data.images[0] ? <Image source={{ uri: hotel.data.images[0] }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" /> : null}
            <View style={styles.flex}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {hotel.data.name}
              </Text>
              <Text variant="caption" color="gold">
                {starsLabel(hotel.data.stars)}
              </Text>
              <Text variant="bodySm" color="secondary" numberOfLines={1}>
                {t('hotels.perNightFrom', { price: formatUSD(hotel.data.priceFrom) })}
              </Text>
            </View>
          </View>
        ) : null}

        <Text variant="h3">{t('hotels.checkIn')}</Text>
        <DayStrip days={checkInDays} selected={checkIn} onSelect={pickCheckIn} />

        <Text variant="h3">{t('hotels.checkOut')}</Text>
        <DayStrip days={checkOutDays} selected={checkOut} onSelect={setCheckOut} />

        <View style={styles.guestsRow}>
          <Text variant="h3" style={styles.flex}>
            {t('hotels.guests')}
          </Text>
          <IconButton icon="remove" variant="surface" onPress={() => setGuests((g) => Math.max(1, g - 1))} disabled={guests <= 1} accessibilityLabel="−" />
          <Text variant="h3" style={styles.guestsValue}>
            {guests}
          </Text>
          <IconButton icon="add" variant="surface" onPress={() => setGuests((g) => Math.min(maxGuests, g + 1))} disabled={guests >= maxGuests} accessibilityLabel="+" />
        </View>

        <TextField
          label={t('hotels.name')}
          placeholder={t('auth.namePlaceholder')}
          value={name}
          onChangeText={setName}
          autoComplete="name"
          textContentType="name"
          error={touched ? nameError : undefined}
          maxLength={60}
        />
        <PhoneField label={t('hotels.phone')} value={phone} onChangeDigits={setPhone} error={touched ? phoneError : undefined} />

        {hotel.data ? (
          <View style={styles.summary}>
            <Text variant="bodySm" color="secondary">
              {formatDayMonth(checkIn, t)} — {formatDayMonth(checkOut, t)} · {t('hotels.nights', { count: nights })}
            </Text>
            <Text variant="bodyStrong">{t('hotels.estimate', { price: formatUSD(estimate) })}</Text>
          </View>
        ) : null}
      </KeyboardAwareScrollView>

      <StickyBar>
        <View style={styles.flex}>
          <Button title={t('hotels.send')} fullWidth loading={book.isPending} disabled={!hotel.data} onPress={submit} />
          <Text variant="caption" color="secondary" align="center" style={styles.caption}>
            {t('hotels.sendNote')}
          </Text>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    minHeight: sizes.header,
  },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: layout.stickyBarHeight + spacing.giant,
    gap: spacing.lg,
  },
  hotelCard: {
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
  daysRow: {
    gap: spacing.sm,
    flexDirection: 'row',
  },
  day: {
    width: sizes.calendarDay,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  daySelected: {
    backgroundColor: t.colors.gold,
    borderColor: t.colors.gold,
  },
  onGold: {
    color: t.colors.textOnGold,
  },
  guestsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  guestsValue: {
    minWidth: spacing.xl,
    textAlign: 'center',
  },
  summary: {
    gap: spacing.xxs,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: t.colors.goldSoft,
    borderWidth: sizes.border,
    borderColor: t.colors.goldBorder,
  },
  caption: {
    marginTop: spacing.xs,
  },
  success: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.xxl,
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
  successActions: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
}));
