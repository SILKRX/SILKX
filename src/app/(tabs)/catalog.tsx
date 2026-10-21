import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type FlatList, ScrollView, type TextInputInstance, View } from 'react-native';

import { CatalogList } from '@/components/catalog/CatalogList';
import { CatalogMap } from '@/components/catalog/CatalogMap';
import { FiltersSheet, type FiltersSheetHandle } from '@/components/catalog/FiltersSheet';
import { sortLabel, SortSheet, type SortSheetHandle } from '@/components/catalog/SortSheet';
import { Chip, IconButton, Screen, SegmentedControl, type SegmentOption, Text, TextField } from '@/components/ui';
import { useDebouncedValue } from '@/hooks/common';
import { analytics } from '@/lib/analytics';
import { countActiveFilters, useFiltersStore } from '@/store/filters';
import { useFeatureFlag } from '@/store/flags';
import { makeStyles, motion, sizes, spacing } from '@/theme';
import type { Property } from '@/types/domain';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/system/ErrorBoundary';

type ViewMode = 'list' | 'map';

export default function CatalogScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ view?: string; focus?: string; section?: string }>();
  const mapEnabled = useFeatureFlag('mapView');

  const filters = useFiltersStore((s) => s.filters);
  const setFilters = useFiltersStore((s) => s.setFilters);
  const resetFilters = useFiltersStore((s) => s.reset);
  const activeCount = countActiveFilters(filters);

  const [mode, setMode] = useState<ViewMode>('list');
  const effectiveMode: ViewMode = mapEnabled ? mode : 'list';
  const [query, setQuery] = useState(filters.query);
  const debouncedQuery = useDebouncedValue(query, motion.searchDebounce);

  const inputRef = useRef<TextInputInstance>(null);
  const listRef = useRef<FlatList<Property>>(null);
  const filtersRef = useRef<FiltersSheetHandle>(null);
  const sortRef = useRef<SortSheetHandle>(null);

  const modeOptions: SegmentOption<ViewMode>[] = [
    { value: 'list', label: t('catalog.list'), icon: 'list' },
    { value: 'map', label: t('catalog.map'), icon: 'map-outline' },
  ];

  // Поиск с задержкой: запрос уходит, когда пользователь перестал печатать
  useEffect(() => {
    if (debouncedQuery !== useFiltersStore.getState().filters.query) setFilters({ query: debouncedQuery });
  }, [debouncedQuery, setFilters]);

  // Сброс фильтров снаружи (кнопка «Сбросить») не трогает поиск, но синхронизируем поле при смене
  useEffect(() => {
    setQuery((current) => (current === filters.query ? current : filters.query));
  }, [filters.query]);

  // Переходы с главной: ?view=map, ?focus=1, ?section=complexes. После обработки параметры
  // очищаются, чтобы повторный переход с теми же параметрами снова сработал.
  useEffect(() => {
    const { view, focus, section } = params;
    if (!view && !focus && !section) return;
    if (view === 'map' && mapEnabled) setMode('map');
    if (view === 'list' || focus === '1' || section === 'complexes') setMode('list');
    if (section === 'complexes') listRef.current?.scrollToOffset({ offset: 0, animated: true });
    if (focus === '1') setTimeout(() => inputRef.current?.focus(), motion.slow);
    router.setParams({ view: undefined, focus: undefined, section: undefined });
  }, [params, mapEnabled, router]);

  const changeMode = (next: ViewMode) => {
    setMode(next);
    analytics.track('catalog_view_mode', { mode: next });
  };

  const submitSearch = () => {
    const trimmed = query.trim();
    setFilters({ query: trimmed });
    if (trimmed) analytics.track('search_submitted', { query: trimmed });
  };

  const clearSearch = () => {
    setQuery('');
    setFilters({ query: '' });
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text variant="h1" accessibilityRole="header">
            {t('catalog.title')}
          </Text>
          {mapEnabled ? <SegmentedControl compact options={modeOptions} value={effectiveMode} onChange={changeMode} style={styles.modeSwitch} /> : null}
        </View>

        <View style={styles.searchRow}>
          <TextField
            ref={inputRef}
            containerStyle={styles.flex}
            leftIcon="search"
            placeholder={t('catalog.searchPlaceholder')}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submitSearch}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel={t('common.search')}
            right={
              query.length > 0 ? (
                <IconButton icon="close-circle" variant="ghost" size="sm" onPress={clearSearch} accessibilityLabel={t('common.reset')} />
              ) : null
            }
          />
          <IconButton
            icon="options-outline"
            size="lg"
            badge={activeCount}
            onPress={() => filtersRef.current?.open()}
            accessibilityLabel={t('catalog.filters')}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          <Chip label={t('dealType.sale')} selected={filters.dealType === 'sale'} onPress={() => setFilters({ dealType: 'sale' })} />
          <Chip label={t('dealType.rent')} selected={filters.dealType === 'rent'} onPress={() => setFilters({ dealType: 'rent' })} />
          <View style={styles.chipDivider} />
          <Chip icon="swap-vertical" label={sortLabel(filters.sort, t)} onPress={() => sortRef.current?.open()} />
          {activeCount > 0 ? <Chip icon="close" label={t('catalog.resetFilters')} onPress={resetFilters} /> : null}
        </ScrollView>
      </View>

      {effectiveMode === 'list' ? (
        <CatalogList filters={filters} onResetFilters={resetFilters} listRef={listRef} />
      ) : (
        <CatalogMap filters={filters} onResetFilters={resetFilters} />
      )}

      <FiltersSheet ref={filtersRef} />
      <SortSheet ref={sortRef} />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  flex: {
    flex: 1,
  },
  header: {
    paddingTop: spacing.sm,
    gap: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: sizes.divider,
    borderBottomColor: t.colors.border,
    backgroundColor: t.colors.background,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  modeSwitch: {
    flexGrow: 0,
    flexShrink: 1,
    minWidth: sizes.avatar.xl * 2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  chips: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  chipDivider: {
    width: sizes.divider,
    height: sizes.chip - spacing.md,
    backgroundColor: t.colors.border,
    marginHorizontal: spacing.xs,
  },
}));
