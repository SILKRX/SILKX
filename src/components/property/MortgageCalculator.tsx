import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { SegmentedControl, type SegmentOption, Slider, Text } from '@/components/ui';
import { analytics } from '@/lib/analytics';
import { formatUSD } from '@/lib/format';
import {
  calculateLoan,
  DOWN_PAYMENT_SHARE,
  INSTALLMENT_TERMS_MONTHS,
  MORTGAGE_DEFAULT_RATE,
  MORTGAGE_TERMS_YEARS,
} from '@/lib/mortgage';
import { makeStyles, radii, sizes, spacing, useTheme } from '@/theme';
import type { Property } from '@/types/domain';

import { DonutChart } from './DonutChart';

type CalcMode = 'mortgage' | 'installment';

const MONTHS_IN_YEAR = 12;
const INSTALLMENT_STEP_MONTHS = 6;
const PERCENT = 100;

/**
 * Калькулятор ипотеки и рассрочки: слайдеры взноса и срока, ежемесячный платёж
 * и кольцевая диаграмма «взнос / тело кредита / проценты».
 */
export function MortgageCalculator({ property }: { property: Property }) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [mode, setMode] = useState<CalcMode>(property.installment && !property.mortgage ? 'installment' : 'mortgage');
  const [share, setShare] = useState<number>(DOWN_PAYMENT_SHARE.default);
  const [years, setYears] = useState<number>(MORTGAGE_TERMS_YEARS.default);
  const [months, setMonths] = useState<number>(INSTALLMENT_TERMS_MONTHS.default);

  const termMonths = mode === 'mortgage' ? years * MONTHS_IN_YEAR : months;
  const rate = mode === 'mortgage' ? MORTGAGE_DEFAULT_RATE : 0;
  const result = calculateLoan({ price: property.price, downPaymentShare: share, termMonths, annualRate: rate });

  const options: SegmentOption<CalcMode>[] = [{ value: 'mortgage', label: t('mortgage.mortgageTab') }];
  if (property.installment) options.push({ value: 'installment', label: t('mortgage.installmentTab') });

  const track = () => analytics.track('mortgage_used', { propertyId: property.id, termMonths, mode });

  const legend = [
    { key: 'down', color: colors.chart1, label: t('mortgage.downPayment'), value: result.downPayment },
    { key: 'principal', color: colors.chart2, label: t('mortgage.principal'), value: result.principal },
    { key: 'interest', color: colors.chart3, label: t('mortgage.interest'), value: result.interest },
  ];

  return (
    <View style={styles.card}>
      {options.length > 1 ? <SegmentedControl options={options} value={mode} onChange={setMode} /> : null}

      <View style={styles.chartRow}>
        <DonutChart
          segments={legend.map((l) => ({ key: l.key, value: l.value, color: l.color }))}
          accessibilityLabel={`${t('mortgage.monthly')}: ${formatUSD(result.monthly)}`}
        >
          <Text variant="caption" color="secondary" align="center">
            {t('mortgage.monthly')}
          </Text>
          <Text variant="price" align="center">
            {formatUSD(result.monthly)}
          </Text>
          <Text variant="caption" color="tertiary" align="center">
            {mode === 'mortgage' ? t('mortgage.rate', { rate }) : '0%'}
          </Text>
        </DonutChart>
        <View style={styles.legend}>
          {legend.map((item) => (
            <View key={item.key} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <View style={styles.flex}>
                <Text variant="caption" color="secondary">
                  {item.label}
                </Text>
                <Text variant="bodyStrong">{formatUSD(item.value)}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text variant="bodySm" color="secondary">
            {t('mortgage.downPayment')}
          </Text>
          <Text variant="bodyStrong">
            {Math.round(share * PERCENT)}% · {formatUSD(result.downPayment)}
          </Text>
        </View>
        <Slider
          value={share}
          min={DOWN_PAYMENT_SHARE.min}
          max={DOWN_PAYMENT_SHARE.max}
          step={DOWN_PAYMENT_SHARE.step}
          onChange={setShare}
          onChangeEnd={track}
          accessibilityLabel={t('mortgage.downPayment')}
        />
      </View>

      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text variant="bodySm" color="secondary">
            {t('mortgage.term')}
          </Text>
          <Text variant="bodyStrong">{mode === 'mortgage' ? t('mortgage.years', { count: years }) : t('mortgage.months', { count: months })}</Text>
        </View>
        {mode === 'mortgage' ? (
          <Slider
            value={years}
            min={MORTGAGE_TERMS_YEARS.min}
            max={MORTGAGE_TERMS_YEARS.max}
            step={1}
            onChange={setYears}
            onChangeEnd={track}
            accessibilityLabel={t('mortgage.term')}
          />
        ) : (
          <Slider
            value={months}
            min={INSTALLMENT_TERMS_MONTHS.min}
            max={INSTALLMENT_TERMS_MONTHS.max}
            step={INSTALLMENT_STEP_MONTHS}
            onChange={setMonths}
            onChangeEnd={track}
            accessibilityLabel={t('mortgage.term')}
          />
        )}
      </View>

      <View style={styles.totalRow}>
        <Text variant="bodySm" color="secondary">
          {t('mortgage.total')}
        </Text>
        <Text variant="title">{formatUSD(result.totalPaid + result.downPayment)}</Text>
      </View>
      <Text variant="caption" color="tertiary">
        {t('mortgage.disclaimer')}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  flex: {
    flex: 1,
  },
  card: {
    padding: spacing.lg,
    gap: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  legend: {
    flex: 1,
    gap: spacing.md,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: sizes.statusDot,
    height: sizes.statusDot,
    borderRadius: radii.pill,
  },
  field: {
    gap: spacing.xs,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: spacing.md,
    borderTopWidth: sizes.divider,
    borderTopColor: t.colors.border,
  },
}));
