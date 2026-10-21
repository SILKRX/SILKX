import { useTranslation } from 'react-i18next';

import type { ErrorMessageKey } from '@/lib/errors';

/**
 * Ошибки валидации хранятся в схемах Zod как ключи i18n (а не готовые строки) —
 * так сообщения переводятся на лету при смене языка.
 */
export const VALIDATION_KEYS = [
  'validation.required',
  'validation.email',
  'validation.phone',
  'validation.phoneOperator',
  'validation.passwordMin',
  'validation.passwordUpper',
  'validation.passwordDigit',
  'validation.nameMin',
  'validation.role',
  'validation.terms',
  'validation.price',
  'validation.area',
  'validation.rooms',
  'validation.floor',
  'validation.floorsTotal',
  'validation.address',
  'validation.photos',
  'validation.description',
  'validation.message',
  'validation.topic',
] as const;

export type ValidationKey = (typeof VALIDATION_KEYS)[number];

const API_ERROR_KEYS: readonly ErrorMessageKey[] = [
  'errors.generic',
  'errors.network',
  'errors.server',
  'errors.unauthorized',
  'errors.notFound',
  'auth.errors.invalidCredentials',
  'auth.errors.emailTaken',
  'auth.errors.phoneTaken',
  'auth.errors.banned',
  'booking.slotTaken',
];

type FormMessageKey = ValidationKey | ErrorMessageKey;

function isFormMessageKey(value: unknown): value is FormMessageKey {
  return typeof value === 'string' && ((VALIDATION_KEYS as readonly string[]).includes(value) || (API_ERROR_KEYS as readonly string[]).includes(value));
}

/** Переводит сообщение ошибки поля; неизвестные строки (баг схемы) заменяет общим текстом. */
export function useFormErrorText(): (message: string | undefined) => string | undefined {
  const { t } = useTranslation();
  return (message) => {
    if (!message) return undefined;
    return isFormMessageKey(message) ? t(message) : t('errors.generic');
  };
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
