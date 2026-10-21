import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { Button, EmptyState, PressableScale, Screen, ScreenHeader, Skeleton, SkeletonGroup, StickyBar, Text } from '@/components/ui';
import { useSaveSchedule, useSellerSchedule } from '@/hooks/api/engagement';
import { errorMessageKey } from '@/lib/errors';
import { monthShort, pad2, parseDateKey, weekdayShort } from '@/lib/format';
import { toast } from '@/store/toast';
import { layout, makeStyles, opacity, radii, sizes, spacing } from '@/theme';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

const FIRST_HOUR = 9;
const LAST_HOUR = 20;
const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => FIRST_HOUR + i);
const SKELETON_DAYS = 6;

/** Слоты для показов: продавец отмечает часы, в которые готов показывать объекты. */
export default function SellerSlotsScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  const schedule = useSellerSchedule();
  const save = useSaveSchedule();
  const [hoursByDate, setHoursByDate] = useState<Record<string, number[]>>({});
  const [dirty, setDirty] = useState(false);
  const [activeDate, setActiveDate] = useState<string | null>(null);

  useEffect(() => {
    const data = schedule.data;
    if (!data || dirty) return;
    setHoursByDate(Object.fromEntries(data.map((day) => [day.date, day.hours])));
    setActiveDate((current) => current ?? data[0]?.date ?? null);
  }, [schedule.data, dirty]);

  const days = schedule.data ?? [];
  const active = days.find((day) => day.date === activeDate) ?? days[0];
  const selectedHours = active ? (hoursByDate[active.date] ?? []) : [];

  const toggle = (hour: number) => {
    if (!active || active.booked.includes(hour)) return;
    setDirty(true);
    setHoursByDate((current) => {
      const hours = current[active.date] ?? [];
      const next = hours.includes(hour) ? hours.filter((h) => h !== hour) : [...hours, hour].sort((a, b) => a - b);
      return { ...current, [active.date]: next };
    });
  };

  const submit = () =>
    save.mutate(
      Object.entries(hoursByDate).map(([date, hours]) => ({ date, hours })),
      {
        onSuccess: () => {
          setDirty(false);
          toast.success(t('slots.saved'));
        },
        onError: (error) => toast.error(t(errorMessageKey(error))),
      },
    );

  return (
    <Screen>
      <ScreenHeader title={t('slots.title')} subtitle={t('slots.subtitle')} />
      {schedule.isPending ? (
        <SkeletonGroup>
          <View style={styles.daysRowPadded}>
            {Array.from({ length: SKELETON_DAYS }, (_, i) => (
              <Skeleton key={i} width={layout.slotDayWidth} height={sizes.calendarDay + spacing.xl} radius={radii.lg} />
            ))}
          </View>
        </SkeletonGroup>
      ) : schedule.isError ? (
        <EmptyState icon="cloud-offline-outline" title={t('errors.generic')} actionLabel={t('common.retry')} onAction={() => void schedule.refetch()} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysRow}>
            {days.map((day) => {
              const date = parseDateKey(day.date);
              const selected = day.date === active?.date;
              const count = hoursByDate[day.date]?.length ?? 0;
              return (
                <PressableScale
                  key={day.date}
                  haptic="selection"
                  onPress={() => setActiveDate(day.date)}
                  style={[styles.day, selected && styles.daySelected]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text variant="caption" style={selected ? styles.onGold : undefined} color={selected ? undefined : 'secondary'}>
                    {weekdayShort(date, t)}
                  </Text>
                  <Text variant="h3" style={selected ? styles.onGold : undefined}>
                    {date.getDate()}
                  </Text>
                  <Text variant="micro" style={selected ? styles.onGold : undefined} color={selected ? undefined : 'tertiary'}>
                    {monthShort(date, t)} · {count}
                  </Text>
                </PressableScale>
              );
            })}
          </ScrollView>

          {active ? (
            <View style={styles.hours}>
              {HOURS.map((hour) => {
                const booked = active.booked.includes(hour);
                const selected = selectedHours.includes(hour);
                return (
                  <PressableScale
                    key={hour}
                    haptic="selection"
                    onPress={() => toggle(hour)}
                    disabled={booked}
                    style={[styles.hour, selected && styles.hourSelected, booked && styles.hourBooked]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected, disabled: booked }}
                  >
                    <Text variant="buttonSm" style={selected && !booked ? styles.onGold : undefined}>
                      {pad2(hour)}:00
                    </Text>
                    {booked ? (
                      <Text variant="micro" color="warning">
                        {t('slots.booked')}
                      </Text>
                    ) : null}
                  </PressableScale>
                );
              })}
            </View>
          ) : null}
        </ScrollView>
      )}
      <StickyBar>
        <View style={styles.flex}>
          <Button title={t('common.save')} fullWidth disabled={!dirty} loading={save.isPending} onPress={submit} />
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
    paddingBottom: layout.stickyBarHeight + spacing.giant,
    gap: spacing.xl,
  },
  daysRow: {
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
  },
  daysRowPadded: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
  },
  day: {
    width: layout.slotDayWidth,
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
  hours: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
  },
  hour: {
    minWidth: sizes.timeSlot * 2,
    minHeight: sizes.timeSlot,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  hourSelected: {
    backgroundColor: t.colors.gold,
    borderColor: t.colors.gold,
  },
  hourBooked: {
    backgroundColor: t.colors.warningSoft,
    borderColor: t.colors.warningSoft,
    opacity: opacity.glass,
  },
}));
