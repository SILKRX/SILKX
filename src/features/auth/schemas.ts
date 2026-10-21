import { z } from 'zod';

import { EMAIL_PATTERN } from '@/features/forms';
import { hasValidUzOperator } from '@/lib/phone';

const PASSWORD_MIN = 8;
const NAME_MIN = 2;
const NAME_MAX = 60;
const COMPANY_MAX = 80;

const email = z.string().trim().min(1, 'validation.required').regex(EMAIL_PATTERN, 'validation.email');

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'validation.required'),
});

export type SignInValues = z.infer<typeof signInSchema>;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, 'validation.passwordMin')
  .regex(/[A-ZА-ЯЁ]/, 'validation.passwordUpper')
  .regex(/\d/, 'validation.passwordDigit');

export const phoneSchema = z
  .string()
  .regex(/^\d{9}$/, 'validation.phone')
  .refine(hasValidUzOperator, 'validation.phoneOperator');

export const nameSchema = z.string().trim().min(NAME_MIN, 'validation.nameMin').max(NAME_MAX, 'validation.nameMin');

export const signUpSchema = z.object({
  role: z.enum(['buyer', 'seller'], 'validation.role'),
  name: nameSchema,
  email,
  /** 9 цифр без кода страны */
  phone: phoneSchema,
  password: passwordSchema,
  company: z.string().trim().max(COMPANY_MAX),
  terms: z.boolean().refine((accepted) => accepted, 'validation.terms'),
});

export type SignUpValues = z.infer<typeof signUpSchema>;

export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

const STRONG_LENGTH = 12;

/** Оценка надёжности: длина, регистры, цифры, спецсимволы. 0 — пусто, 4 — отлично. */
export function passwordStrength(password: string): PasswordStrength {
  if (!password) return 0;
  let score = 0;
  if (password.length >= PASSWORD_MIN) score += 1;
  if (/[a-zа-яё]/.test(password) && /[A-ZА-ЯЁ]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^\w\s]/.test(password) || password.length >= STRONG_LENGTH) score += 1;
  return Math.max(1, Math.min(score, 4)) as PasswordStrength;
}
