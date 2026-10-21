import { type ReactNode, type Ref, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  Button,
  Chip,
  ChipGroup,
  RangeSlider,
  SegmentedControl,
  Sheet,
  type SheetRef,
  Switch,
  Text,
  TextField,
} from '@/components/ui';
import { DISTRICT_IDS } from '@/constants/districts';
import { useCatalogCount, usePriceHistogram } from '@/hooks/api/catalog';
import { analytics } from '@/lib/analytics';
import { formatUSD } from '@/lib/format';
import {
  type CatalogFilters,
  countActiveFilters,
  DEFAULT_FILTERS,
  PRICE_RANGES,
  ROOM_FILTER_VALUES,
  type RoomFilter,
  useFiltersStore,
} from '@/store/filters';
import { layout, makeStyles, sizes, spacing } from '@/theme';
import type { DealType, PropertyType, Renovation } from '@/types/domain';

export interface FiltersSheetHandle {
  open: () => void;
}

const DEAL_TYPES: readonly DealType[] = ['sale', 'rent'];
const PROPERTY_TYPES: readonly PropertyType[] = ['apartment', 'house', 'townhouse', 'commercial'];
const RENOVATIONS: readonly Renovation[] = ['shell', 'whitebox', 'euro', 'designer'];
const SNAP_POINTS = [layout.sheetSnapPoints[1]];
const FLOOR_MIN = 1;
const FLOOR_MAX = 99;
const FLOOR_MAX_LENGTH = 2;

function parseFloor(text: string): number | null {
  const digits = text.replace(/\D/g, '');
  if (!digits) return null;
  return Math.min(Math.max(Number(digits), FLOOR_MIN), FLOOR_MAX);
}

function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text variant="title">{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

/**
 * Фильтры каталога. Пользователь правит черновик, а кнопка внизу в реальном времени
 * показывает, сколько объектов найдётся («Показать 12 объектов»). Применение — одним действием.
 */
export function FiltersSheet({ ref }: { ref: Ref<FiltersSheetHandle> }) {
  const styles = useStyles();
  const { t } = useTranslation();
  const sheetRef = useRef<SheetRef>(null);
  const replace = useFiltersStore((s) => s.replace);
  const [draft, setDraft] = useState<CatalogFilters>(DEFAULT_FILTERS);
  const [open, setOpen] = useState(false);

  const count = useCatalogCount(draft, open);
  const histogram = usePriceHistogram(draft.dealType);
  const range = PRICE_RANGES[draft.dealType];

  useImperativeHandle(ref, () => ({
    open: () => {
      setDraft(useFiltersStore.getState().filters);
      setOpen(true);
      sheetRef.current?.present();
    },
  }));

  const patch = (changes: Partial<CatalogFilters>) =>
    setDraft((current) => {
      const next = { ...current, ...changes };
      if (changes.dealType && changes.dealType !== current.dealType) {
        next.priceMin = null;
        next.priceMax = null;
      }
      return next;
    });

  const resetDraft = () => setDraft((current) => ({ ...DEFAULT_FILTERS, dealType: current.dealType, query: current.query, sort: current.sort }));

  const apply = () => {
    replace(draft);
    analytics.track('filters_applied', { activeCount: countActiveFilters(draft), dealType: draft.dealType });
    sheetRef.current?.dismiss();
  };

  const low = draft.priceMin ?? range.min;
  const high = draft.priceMax ?? range.max;
  const priceLabel = `${formatUSD(low)} — ${formatUSD(high)}${draft.priceMax === null ? '+' : ''}`;

  const shown = count.data;
  const applyLabel = shown === undefined ? t('common.apply') : shown === 0 ? t('filters.showZero') : t('filters.show', { count: shown });

  const roomLabel = (value: RoomFilter) => (value === 0 ? t('rooms.studio') : value === 4 ? t('rooms.fourPlus') : String(value));

  return (
    <Sheet
      ref={sheetRef}
      title={t('filters.title')}
      snapPoints={SNAP_POINTS}
      scrollable
      onDismiss={() => setOpen(false)}
      footer={
        <View style={styles.footer}>
          <Button title={t('filters.reset')} variant="secondary" onPress={resetDraft} />
          <View style={styles.flex}>
            <Button title={applyLabel} onPress={apply} fullWidth loading={shown === undefined && count.isFetching} />
          </View>
        </View>
      }
    >
      <Section title={t('filters.dealType')}>
        <SegmentedControl
          options={DEAL_TYPES.map((value) => ({ value, label: t(`dealType.${value}`) }))}
          value={draft.dealType}
          onChange={(dealType) => patch({ dealType })}
        />
      </Section>

      <Section title={t('filters.district')}>
        <ChipGroup
          options={DISTRICT_IDS.map((id) => ({ value: id, label: t(`districts.${id}`) }))}
          value={draft.districts}
          onChange={(districts) => patch({ districts })}
        />
      </Section>

      <Section
        title={t('filters.price')}
        right={
          <Text variant="bodyStrong" color="gold">
            {priceLabel}
          </Text>
        }
      >
        <RangeSlider
          min={range.min}
          max={range.max}
          step={range.step}
          value={{ low, high }}
          histogram={histogram.data?.map((bucket) => bucket.count)}
          onChange={(next) =>
            patch({
              priceMin: next.low <= range.min ? null : next.low,
              priceMax: next.high >= range.max ? null : next.high,
            })
          }
        />
      </Section>

      <Section title={t('filters.propertyType')}>
        <ChipGroup
          options={PROPERTY_TYPES.map((value) => ({ value, label: t(`propertyType.${value}`) }))}
          value={draft.types}
          onChange={(types) => patch({ types })}
        />
      </Section>

      <Section title={t('filters.rooms')}>
        <ChipGroup
          options={ROOM_FILTER_VALUES.map((value) => ({ value, label: roomLabel(value) }))}
          value={draft.rooms}
          onChange={(rooms) => patch({ rooms })}
        />
      </Section>

      <Section title={t('filters.floor')}>
        <View style={styles.row}>
          <TextField
            inSheet
            containerStyle={styles.flex}
            placeholder={t('filters.priceFrom')}
            keyboardType="number-pad"
            maxLength={FLOOR_MAX_LENGTH}
            value={draft.floorMin === null ? '' : String(draft.floorMin)}
            onChangeText={(text) => patch({ floorMin: parseFloor(text) })}
            accessibilityLabel={`${t('filters.floor')} ${t('filters.priceFrom')}`}
          />
          <TextField
            inSheet
            containerStyle={styles.flex}
            placeholder={t('filters.priceTo')}
            keyboardType="number-pad"
            maxLength={FLOOR_MAX_LENGTH}
            value={draft.floorMax === null ? '' : String(draft.floorMax)}
            onChangeText={(text) => patch({ floorMax: parseFloor(text) })}
            accessibilityLabel={`${t('filters.floor')} ${t('filters.priceTo')}`}
          />
        </View>
        <View style={styles.chips}>
          <Chip label={t('filters.notFirst')} selected={draft.notFirst} onPress={() => patch({ notFirst: !draft.notFirst })} />
          <Chip label={t('filters.notLast')} selected={draft.notLast} onPress={() => patch({ notLast: !draft.notLast })} />
        </View>
      </Section>

      <Section title={t('filters.renovation')}>
        <ChipGroup
          options={RENOVATIONS.map((value) => ({ value, label: t(`renovation.${value}`) }))}
          value={draft.renovations}
          onChange={(renovations) => patch({ renovations })}
        />
      </Section>

      <View style={styles.switchRow}>
        <View style={styles.flex}>
          <Text variant="title">{t('filters.installment')}</Text>
          <Text variant="bodySm" color="secondary">
            {t('filters.installmentHint')}
          </Text>
        </View>
        <Switch value={draft.installment} onValueChange={(installment) => patch({ installment })} accessibilityLabel={t('filters.installment')} />
      </View>
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  flex: {
    flex: 1,
  },
  section: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
    marginBottom: spacing.xl,
    borderBottomWidth: sizes.divider,
    borderBottomColor: t.colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
}));
