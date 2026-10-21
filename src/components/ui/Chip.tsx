import { type StyleProp, View, type ViewStyle } from 'react-native';

import { makeStyles, opacity, radii, sizes, spacing, useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Chip({ label, selected = false, onPress, icon, disabled, style }: ChipProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const color = selected ? colors.chipTextSelected : colors.chipText;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      haptic="selection"
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={[styles.chip, selected && styles.selected, disabled && styles.disabled, style]}
    >
      {icon ? <Icon name={icon} size="sm" color={color} /> : null}
      <Text variant="buttonSm" style={{ color }} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

interface ChipGroupProps<T extends string | number> {
  options: readonly { value: T; label: string; icon?: IconName }[];
  value: readonly T[];
  onChange: (next: T[]) => void;
  /** single — выбор одного значения (повторный тап снимает выбор, если allowEmpty) */
  mode?: 'single' | 'multi';
  allowEmpty?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  mode = 'multi',
  allowEmpty = true,
  style,
}: ChipGroupProps<T>) {
  const styles = useStyles();
  const toggle = (item: T) => {
    const selected = value.includes(item);
    if (mode === 'single') {
      if (selected && allowEmpty) onChange([]);
      else onChange([item]);
      return;
    }
    onChange(selected ? value.filter((v) => v !== item) : [...value, item]);
  };
  return (
    <View style={[styles.group, style]}>
      {options.map((o) => (
        <Chip key={String(o.value)} label={o.label} icon={o.icon} selected={value.includes(o.value)} onPress={() => toggle(o.value)} />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  chip: {
    height: sizes.chip,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: sizes.border,
    borderColor: t.colors.border,
    backgroundColor: t.colors.chip,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + spacing.xxs,
  },
  selected: {
    backgroundColor: t.colors.chipSelected,
    borderColor: t.colors.chipSelected,
  },
  disabled: {
    opacity: opacity.disabled,
  },
  group: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
}));
