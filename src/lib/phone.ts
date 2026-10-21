/**
 * Телефоны Узбекистана: +998 XX XXX XX XX.
 * Внутри приложения храним 9 цифр без кода страны, наружу отдаём E.164.
 */

export const UZ_COUNTRY_CODE = '+998';
export const UZ_PHONE_DIGITS = 9;

/** Мобильные коды операторов + 71 (стационарный Ташкент). */
export const UZ_OPERATOR_CODES = ['20', '33', '50', '55', '71', '77', '88', '90', '91', '93', '94', '95', '97', '98', '99'] as const;

/** Любой ввод (вставка «+998 90 123-45-67», «998901234567», «901234567») → максимум 9 цифр. */
export function normalizeUzPhone(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('998') && digits.length > UZ_PHONE_DIGITS) digits = digits.slice(3);
  return digits.slice(0, UZ_PHONE_DIGITS);
}

/** Прогрессивная маска для поля ввода: «90 123 45 67». */
export function formatUzPhoneInput(digits: string): string {
  const d = digits.slice(0, UZ_PHONE_DIGITS);
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter((p) => p.length > 0);
  return parts.join(' ');
}

export function formatUzPhone(e164OrDigits: string): string {
  const digits = normalizeUzPhone(e164OrDigits);
  return digits.length === UZ_PHONE_DIGITS ? `${UZ_COUNTRY_CODE} ${formatUzPhoneInput(digits)}` : e164OrDigits;
}

export function toE164(digits: string): string {
  return `${UZ_COUNTRY_CODE}${normalizeUzPhone(digits)}`;
}

export function isCompleteUzPhone(digits: string): boolean {
  return /^\d{9}$/.test(digits);
}

export function hasValidUzOperator(digits: string): boolean {
  return (UZ_OPERATOR_CODES as readonly string[]).includes(digits.slice(0, 2));
}
