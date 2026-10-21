import type { TFunction } from 'i18next';
import { type Ref, useImperativeHandle, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Icon, PressableScale, Sheet, type SheetRef, Text } from '@/components/ui';
import { type SortKey, useFiltersStore } from '@/store/filters';
import { makeStyles, motion, radii, sizes, spacing, useTheme } from '@/theme';

const SORT_OPTIONS = [
  { value: 'recommended', key: 'catalog.sortRecommended' },
  { value: 'priceAsc', key: 'catalog.sortPriceAsc' },
  { value: 'priceDesc', key: 'catalog.sortPriceDesc' },
  { value: 'newest', key: 'catalog.sortNewest' },
  { value: 'area', key: 'catalog.sortArea' },
] as const satisfies readonly { value: SortKey; key: string }[];

export function sortLabel(sort: SortKey, t: TFunction): string {
  const option = SORT_OPTIONS.find((o) => o.value === sort) ?? SORT_OPTIONS[0];
  return t(option.key);
}

export interface SortSheetHandle {
  open: () => void;
}

export function SortSheet({ ref }: { ref: Ref<SortSheetHandle> }) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const sheetRef = useRef<SheetRef>(null);
  const sort = useFiltersStore((s) => s.filters.sort);
  const setFilters = useFiltersStore((s) => s.setFilters);

  useImperativeHandle(ref, () => ({ open: () => sheetRef.current?.present() }));

  return (
    <Sheet ref={sheetRef} title={t('catalog.sort')}>
      <View style={styles.list}>
        {SORT_OPTIONS.map((option) => {
          const selected = option.value === sort;
          return (
            <PressableScale
              key={option.value}
              haptic="selection"
              scaleTo={motion.pressScaleSubtle}
              style={[styles.row, selected && styles.rowSelected]}
              onPress={() => {
                setFilters({ sort: option.value });
                sheetRef.current?.dismiss();
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
            >
              <Text variant={selected ? 'bodyStrong' : 'body'} style={styles.label}>
                {t(option.key)}
              </Text>
              {selected ? <Icon name="checkmark-circle" size="md" color={colors.gold} /> : null}
            </PressableScale>
          );
        })}
      </View>
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  list: {
    gap: spacing.xs,
  },
  row: {
    minHeight: sizes.touch + spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  rowSelected: {
    backgroundColor: t.colors.goldSoft,
  },
  label: {
    flex: 1,
  },
}));
