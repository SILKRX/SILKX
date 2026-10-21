import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, EmptyState, Icon, IconButton, PressableScale, Skeleton, SkeletonGroup, StickyBar, Text, TextField } from '@/components/ui';
import { priceLabel, propertyTitle } from '@/features/property/format';
import { useProperty } from '@/hooks/api/catalog';
import { useBookViewing, useViewingSlots } from '@/hooks/api/engagement';
import { errorMessageKey, isApiError } from '@/lib/errors';
import { formatDateTime, formatTime, lowerFirst, monthShort, parseDateKey, weekdayShort } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { scheduleViewingReminder } from '@/lib/push';
import type { DaySlots } from '@/services/api';
import { usePreferencesStore } from '@/store/preferences';
import { useRemindersStore } from '@/store/reminders';
import { toast } from '@/store/toast';
import { layout, makeStyles, motion, opacity, radii, sizes, spacing, useTheme } from '@/theme';
import type { ViewingSlot } from '@/types/domain';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

const NOTE_MAX = 300;
const DAY_SKELETONS = 5;

/** Запись на показ: лента дат → свободные слоты продавца → комментарий → подтверждение. */
export default function BookViewingScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const propertyId = id ?? '';
  const property = useProperty(propertyId);
  const slots = useViewingSlots(propertyId);
  const book = useBookViewing();
  const remindersOn = usePreferencesStore((s) => s.notifications.viewings);
  const rememberReminder = useRemindersStore((s) => s.remember);

  const days: DaySlots[] = slots.data ?? [];
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [slot, setSlot] = useState<ViewingSlot | null>(null);
  const [note, setNote] = useState('');
  const [bookedAt, setBookedAt] = useState<Date | null>(null);

  const firstAvailable = days.find((d) => d.slots.some((s) => !s.booked));
  const activeDay = days.find((d) => d.date === dayKey) ?? firstAvailable ?? days[0];

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const submit = () => {
    if (!slot || !property.data) return;
    const title = propertyTitle(property.data, t);
    book.mutate(
      { propertyId, start: slot.start, note },
      {
        onSuccess: async (viewing) => {
          haptics.success();
          const start = new Date(viewing.start);
          setBookedAt(start);
          if (remindersOn) {
            const reminderId = await scheduleViewingReminder({
              start,
              title: t('booking.title'),
              body: `${title} — ${formatDateTime(start, t)}`,
            });
            if (reminderId) rememberReminder(viewing.id, reminderId);
          }
        },
        onError: (error) => {
          haptics.error();
          toast.error(t(errorMessageKey(error)));
          if (isApiError(error) && error.code === 'SLOT_TAKEN') {
            setSlot(null);
            void slots.refetch();
          }
        },
      },
    );
  };

  if (bookedAt) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.success}>
          <Animated.View entering={ZoomIn.springify()} style={styles.successIcon}>
            <Icon name="checkmark" size="hero" color={colors.textOnGold} />
          </Animated.View>
          <Animated.View entering={FadeIn.delay(motion.fast)} style={styles.successTexts}>
            <Text variant="h2" align="center">
              {t('booking.success', { date: lowerFirst(formatDateTime(bookedAt, t)) })}
            </Text>
            <Text color="secondary" align="center">
              {t('booking.successText')}
            </Text>
          </Animated.View>
          <View style={styles.successActions}>
            <Button title={t('profile.myViewings')} fullWidth onPress={() => router.replace('/viewings')} />
            <Button title={t('common.done')} variant="ghost" fullWidth onPress={close} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text variant="title" style={styles.flex}>
          {t('booking.title')}
        </Text>
        <IconButton icon="close" variant="ghost" onPress={close} accessibilityLabel={t('common.close')} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        bottomOffset={layout.stickyBarHeight}
        showsVerticalScrollIndicator={false}
      >
        {property.data ? (
          <View style={styles.propertyCard}>
            {property.data.images[0] ? (
              <Image source={{ uri: property.data.images[0] }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" />
            ) : null}
            <View style={styles.flex}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {propertyTitle(property.data, t)}
              </Text>
              <Text variant="bodySm" color="secondary" numberOfLines={1}>
                {priceLabel(property.data, t)} · {property.data.address}
              </Text>
            </View>
          </View>
        ) : (
          <Skeleton height={sizes.avatar.lg + spacing.xl} radius={radii.lg} />
        )}

        <Text variant="h3">{t('booking.chooseDate')}</Text>
        {slots.isPending ? (
          <SkeletonGroup>
            <View style={styles.daysRow}>
              {Array.from({ length: DAY_SKELETONS }, (_, i) => (
                <Skeleton key={i} width={sizes.calendarDay} height={sizes.calendarDay + spacing.xl} radius={radii.lg} />
              ))}
            </View>
          </SkeletonGroup>
        ) : slots.isError ? (
          <EmptyState compact icon="cloud-offline-outline" title={t('errors.generic')} actionLabel={t('common.retry')} onAction={() => void slots.refetch()} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysRow}>
            {days.map((day) => {
              const date = parseDateKey(day.date);
              const free = day.slots.filter((s) => !s.booked).length;
              const selected = day.date === activeDay?.date;
              return (
                <PressableScale
                  key={day.date}
                  haptic="selection"
                  disabled={free === 0}
                  onPress={() => {
                    setDayKey(day.date);
                    setSlot(null);
                  }}
                  style={[styles.day, selected && styles.daySelected, free === 0 && styles.dayDisabled]}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: free === 0 }}
                >
                  <Text variant="caption" style={selected ? styles.onGold : undefined} color={selected ? undefined : 'secondary'}>
                    {weekdayShort(date, t)}
                  </Text>
                  <Text variant="h3" style={selected ? styles.onGold : undefined}>
                    {date.getDate()}
                  </Text>
                  <Text variant="micro" style={selected ? styles.onGold : undefined} color={selected ? undefined : 'tertiary'}>
                    {monthShort(date, t)}
                  </Text>
                </PressableScale>
              );
            })}
          </ScrollView>
        )}

        {activeDay ? (
          <>
            <Text variant="h3">{t('booking.chooseTime')}</Text>
            {activeDay.slots.length === 0 || activeDay.slots.every((s) => s.booked) ? (
              <Text color="secondary">{t('booking.noSlots')}</Text>
            ) : (
              <View style={styles.slots}>
                {activeDay.slots.map((item) => {
                  const selected = slot?.id === item.id;
                  return (
                    <PressableScale
                      key={item.id}
                      haptic="selection"
                      disabled={item.booked}
                      onPress={() => setSlot(item)}
                      style={[styles.slot, selected && styles.slotSelected, item.booked && styles.slotBooked]}
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled: item.booked }}
                    >
                      <Text variant="buttonSm" style={[selected && styles.onGold, item.booked && styles.strike]}>
                        {formatTime(new Date(item.start))}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
            )}
          </>
        ) : null}

        <TextField
          label={`${t('booking.note')} (${t('common.optional')})`}
          placeholder={t('booking.notePlaceholder')}
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={NOTE_MAX}
          helper={`${note.length}/${NOTE_MAX}`}
        />
      </KeyboardAwareScrollView>

      <StickyBar>
        <View style={styles.flex}>
          <Button
            title={slot ? `${t('booking.confirm')} · ${formatTime(new Date(slot.start))}` : t('booking.confirm')}
            fullWidth
            disabled={!slot}
            loading={book.isPending}
            onPress={submit}
          />
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
  propertyCard: {
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
  dayDisabled: {
    opacity: opacity.disabled,
  },
  onGold: {
    color: t.colors.textOnGold,
  },
  slots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slot: {
    minWidth: sizes.timeSlot * 2,
    height: sizes.timeSlot,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  slotSelected: {
    backgroundColor: t.colors.gold,
    borderColor: t.colors.gold,
  },
  slotBooked: {
    backgroundColor: t.colors.surfaceMuted,
    opacity: opacity.disabled,
  },
  strike: {
    textDecorationLine: 'line-through',
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
