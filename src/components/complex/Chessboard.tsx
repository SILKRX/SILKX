import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

import { Chip, Text } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { makeStyles, opacity, radii, sizes, spacing, type ThemeColors, useTheme } from '@/theme';
import type { Complex, ComplexUnit, UnitStatus } from '@/types/domain';

const STATUS_ORDER: readonly UnitStatus[] = ['available', 'reserved', 'sold'];

function statusColors(status: UnitStatus, colors: ThemeColors): { bg: string; border: string; text: string } {
  switch (status) {
    case 'available':
      return { bg: colors.goldSoft, border: colors.gold, text: colors.goldText };
    case 'reserved':
      return { bg: colors.warningSoft, border: colors.warningSoft, text: colors.warning };
    case 'sold':
      return { bg: colors.surfaceMuted, border: colors.border, text: colors.textTertiary };
  }
}

interface ChessboardProps {
  complex: Complex;
  onUnitPress: (unit: ComplexUnit) => void;
}

/**
 * Шахматка квартир: этажи сверху вниз, квартиры на этаже слева направо.
 * Цвет ячейки — статус (свободна / бронь / продана), в ячейке — число комнат.
 */
export function Chessboard({ complex, onUnitPress }: ChessboardProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [block, setBlock] = useState(complex.blocks[0] ?? '');

  const units = complex.units.filter((u) => u.block === block);
  const floors = Array.from({ length: complex.floors }, (_, i) => complex.floors - i);
  const byFloor = new Map<number, ComplexUnit[]>();
  for (const unit of units) {
    const list = byFloor.get(unit.floor) ?? [];
    list.push(unit);
    byFloor.set(unit.floor, list);
  }
  for (const list of byFloor.values()) list.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));

  const counts = STATUS_ORDER.map((status) => ({ status, count: units.filter((u) => u.status === status).length }));

  return (
    <View style={styles.root}>
      {complex.blocks.length > 1 ? (
        <View style={styles.blocks}>
          {complex.blocks.map((name) => (
            <Chip key={name} label={t('complex.block', { name })} selected={name === block} onPress={() => setBlock(name)} />
          ))}
        </View>
      ) : null}

      <View style={styles.legend}>
        {counts.map(({ status, count }) => {
          const palette = statusColors(status, colors);
          return (
            <View key={status} style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: palette.bg, borderColor: palette.border }]} />
              <Text variant="caption" color="secondary">
                {t(`complex.unitStatus.${status}`)} · {count}
              </Text>
            </View>
          );
        })}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gridScroll}>
        <View style={styles.grid}>
          {floors.map((floor) => (
            <View key={floor} style={styles.row}>
              <Text variant="caption" color="tertiary" style={styles.floorLabel}>
                {floor}
              </Text>
              {(byFloor.get(floor) ?? []).map((unit) => {
                const palette = statusColors(unit.status, colors);
                const disabled = unit.status !== 'available';
                return (
                  <Pressable
                    key={unit.id}
                    disabled={disabled}
                    onPress={() => {
                      haptics.selection();
                      onUnitPress(unit);
                    }}
                    style={({ pressed }) => [
                      styles.cell,
                      { backgroundColor: palette.bg, borderColor: palette.border },
                      pressed && styles.cellPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ disabled }}
                    accessibilityLabel={`${t('complex.unitTitle', { number: unit.number })}, ${t(`complex.unitStatus.${unit.status}`)}`}
                  >
                    <Text variant="micro" style={{ color: palette.text }}>
                      {unit.rooms === 0 ? t('complex.unitStudio') : t('complex.unitRooms', { rooms: unit.rooms })}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      <Text variant="caption" color="tertiary">
        {t('complex.chessboardHint')}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    gap: spacing.md,
  },
  blocks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + spacing.xxs,
  },
  legendSwatch: {
    width: sizes.statusDot + spacing.xs,
    height: sizes.statusDot + spacing.xs,
    borderRadius: radii.xs,
    borderWidth: sizes.border,
  },
  gridScroll: {
    paddingVertical: spacing.xs,
  },
  grid: {
    gap: spacing.xs + spacing.xxs,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: t.colors.surface,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + spacing.xxs,
  },
  floorLabel: {
    width: spacing.xxl,
    textAlign: 'right',
    marginRight: spacing.xs,
  },
  cell: {
    width: sizes.unitCell,
    height: sizes.unitCell - spacing.md,
    borderRadius: radii.xs,
    borderWidth: sizes.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellPressed: {
    opacity: opacity.pressed,
  },
}));
