import type { Ref } from 'react';
import { type TextInputInstance, View } from 'react-native';

import { formatUzPhoneInput, normalizeUzPhone, UZ_COUNTRY_CODE } from '@/lib/phone';
import { makeStyles, sizes, spacing } from '@/theme';

import { Text } from './Text';
import { TextField } from './TextField';

interface PhoneFieldProps {
  /** 9 цифр без кода страны */
  value: string;
  onChangeDigits: (digits: string) => void;
  onBlur?: () => void;
  label?: string;
  error?: string;
  editable?: boolean;
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  ref?: Ref<TextInputInstance>;
}

const MASK_PLACEHOLDER = '90 123 45 67';
/** «90 123 45 67» — 9 цифр + 3 пробела */
const MASKED_LENGTH = 12;

/** Телефон Узбекистана со строгой маской +998 XX XXX XX XX. */
export function PhoneField({ value, onChangeDigits, onBlur, label, error, editable, returnKeyType, onSubmitEditing, ref }: PhoneFieldProps) {
  const styles = useStyles();
  return (
    <TextField
      ref={ref}
      label={label}
      error={error}
      value={formatUzPhoneInput(value)}
      onChangeText={(text) => onChangeDigits(normalizeUzPhone(text))}
      onBlur={onBlur}
      placeholder={MASK_PLACEHOLDER}
      keyboardType="phone-pad"
      textContentType="telephoneNumber"
      autoComplete="tel"
      maxLength={MASKED_LENGTH}
      editable={editable}
      returnKeyType={returnKeyType}
      onSubmitEditing={onSubmitEditing}
      prefix={
        <View style={styles.prefix}>
          <Text variant="bodyStrong">{UZ_COUNTRY_CODE}</Text>
        </View>
      }
    />
  );
}

const useStyles = makeStyles((t) => ({
  prefix: {
    paddingRight: spacing.sm,
    borderRightWidth: sizes.border,
    borderRightColor: t.colors.border,
  },
}));
