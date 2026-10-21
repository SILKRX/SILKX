import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { type ComponentRef, type ReactNode, type Ref, useState } from 'react';
import {
  Pressable,
  type StyleProp,
  TextInput,
  type TextInputInstance,
  type TextInputProps,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { makeStyles, motion, opacity, radii, sizes, spacing, typography, useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/** Ограничение системного увеличения шрифта, чтобы поле не ломало вёрстку */
const MAX_INPUT_FONT_SCALE = 1.3;

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: IconName;
  /** Слот перед полем ввода (например, код страны +998) */
  prefix?: ReactNode;
  right?: ReactNode;
  /** Кнопка «показать/скрыть» для паролей */
  secureToggle?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  /** Поле внутри bottom sheet: шит поднимается над клавиатурой */
  inSheet?: boolean;
  ref?: Ref<TextInputInstance>;
}

type SheetInputRef = Ref<ComponentRef<typeof BottomSheetTextInput>>;

export function TextField({
  label,
  error,
  helper,
  leftIcon,
  prefix,
  right,
  secureToggle = false,
  containerStyle,
  inputStyle,
  multiline,
  onFocus,
  onBlur,
  editable = true,
  inSheet = false,
  ref,
  ...inputProps
}: TextFieldProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secureToggle);

  const borderColor = error ? colors.danger : focused ? colors.inputBorderFocus : colors.inputBorder;

  const sharedProps: TextInputProps = {
    ...inputProps,
    editable,
    multiline,
    secureTextEntry: secureToggle ? hidden : inputProps.secureTextEntry,
    placeholderTextColor: colors.placeholder,
    selectionColor: colors.gold,
    cursorColor: colors.gold,
    onFocus: (event) => {
      setFocused(true);
      onFocus?.(event);
    },
    onBlur: (event) => {
      setFocused(false);
      onBlur?.(event);
    },
    style: [styles.input, multiline && styles.inputMultiline, inputStyle],
    accessibilityLabel: inputProps.accessibilityLabel ?? label,
    maxFontSizeMultiplier: MAX_INPUT_FONT_SCALE,
  };

  return (
    <View style={containerStyle}>
      {label ? (
        <Text variant="caption" color={error ? 'danger' : 'secondary'} style={styles.label}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          multiline && styles.fieldMultiline,
          { borderColor },
          !editable && styles.fieldDisabled,
        ]}
      >
        {leftIcon ? <Icon name={leftIcon} size="md" color={focused ? colors.gold : colors.textTertiary} /> : null}
        {prefix}
        {inSheet ? (
          // Типы bottom-sheet описывают ref через класс TextInput из старых версий RN;
          // в рантайме это тот же нативный инстанс поля ввода.
          <BottomSheetTextInput ref={ref as unknown as SheetInputRef} {...sharedProps} />
        ) : (
          <TextInput ref={ref} {...sharedProps} />
        )}
        {secureToggle ? (
          <Pressable
            onPress={() => setHidden((v) => !v)}
            hitSlop={sizes.hitSlop}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'show password' : 'hide password'}
          >
            <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} size="md" color={colors.textTertiary} />
          </Pressable>
        ) : null}
        {right}
      </View>
      {error ? (
        <Animated.View entering={FadeIn.duration(motion.fast)} exiting={FadeOut.duration(motion.instant)} style={styles.messageRow}>
          <Icon name="alert-circle" size="xs" color={colors.danger} />
          <Text variant="caption" color="danger" style={styles.message}>
            {error}
          </Text>
        </Animated.View>
      ) : helper ? (
        <Text variant="caption" color="tertiary" style={styles.helper}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  label: {
    marginBottom: spacing.xs + spacing.xxs,
  },
  field: {
    minHeight: sizes.input,
    borderRadius: radii.md,
    borderWidth: sizes.border,
    backgroundColor: t.colors.inputBackground,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fieldMultiline: {
    minHeight: sizes.textArea,
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
  },
  fieldDisabled: {
    opacity: opacity.muted,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: t.colors.text,
    paddingVertical: spacing.md,
  },
  inputMultiline: {
    minHeight: sizes.textArea - spacing.xxl,
    textAlignVertical: 'top',
    paddingVertical: spacing.none,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs + spacing.xxs,
  },
  message: {
    flex: 1,
  },
  helper: {
    marginTop: spacing.xs + spacing.xxs,
  },
}));
